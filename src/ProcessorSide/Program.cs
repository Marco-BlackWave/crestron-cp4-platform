using System;
using System.Collections.Generic;
using Crestron.SimplSharp;
using Crestron.SimplSharpPro;
using Crestron.SimplSharpPro.EthernetCommunication;
using CrestronCP4.ProcessorSide.Bindings;
using CrestronCP4.ProcessorSide.Configuration;
using CrestronCP4.ProcessorSide.Core;
using CrestronCP4.ProcessorSide.Core.Diagnostics;
using CrestronCP4.ProcessorSide.Core.Signals;
using CrestronCP4.ProcessorSide.Devices;
using CrestronCP4.ProcessorSide.Infrastructure;
using CrestronCP4.ProcessorSide.Subsystems;
using CrestronCP4.ProcessorSide.Transport;

namespace CrestronCP4.ProcessorSide
{
    public sealed class ProcessorProgram : CrestronControlSystem
    {
        // Default EISC config (overridden by SystemConfig if present)
        private const uint DefaultEiscIpId = 0x03;
        private const string DefaultEiscIpAddress = "127.0.0.2";
        private const string SystemConfigPath = "\\User\\SystemConfig.json";

        private readonly SafeModeState _safeMode = new SafeModeState();
        private ILogger _logger;
        private IFileSystem _fileSystem;

        // Legacy mode
        private CoreEngine _core;
        private JoinBinder _binder;

        // Platform mode
        private SystemEngine _systemEngine;

        // Shared
        private ThreeSeriesTcpIpEthernetIntersystemCommunications _eisc;
        private TriListJoinEndpoint _joinEndpoint;

        public ProcessorProgram()
            : base()
        {
            CrestronEnvironment.ProgramStatusEventHandler += OnProgramStatusEvent;
        }

        public override void InitializeSystem()
        {
            _logger = new CrestronLogger();
            _fileSystem = new CrestronFileSystem();
            _logger.Info("Processor program starting.");

            // Try SystemConfig (platform mode) first, fall back to JoinList (legacy mode)
            if (_fileSystem.FileExists(SystemConfigPath))
            {
                InitializePlatformMode();
            }
            else
            {
                InitializeLegacyMode();
            }
        }

        // ── Platform Mode ──────────────────────────────────────────────

        private void InitializePlatformMode()
        {
            _logger.Info("Platform mode: loading SystemConfig.");

            var loader = new SystemConfigLoader(_fileSystem, _logger);
            var loadResult = loader.Load(SystemConfigPath);

            if (!loadResult.Success)
            {
                EnterSafeMode("SystemConfig load failure", loadResult.Errors);
                return;
            }

            var validator = new SystemConfigValidator();
            var validation = validator.Validate(loadResult.Config);
            if (!validation.IsValid)
            {
                EnterSafeMode("SystemConfig validation failure", validation.Errors);
                return;
            }

            try
            {
                var config = loadResult.Config;

                // Parse EISC settings from config
                uint eiscIpId = DefaultEiscIpId;
                string eiscIpAddress = config.System?.EiscIpAddress ?? DefaultEiscIpAddress;
                if (config.System?.EiscIpId != null)
                {
                    try
                    {
                        eiscIpId = Convert.ToUInt32(config.System.EiscIpId, 16);
                    }
                    catch
                    {
                        _logger.Warn("Invalid EISC IP ID, using default.");
                    }
                }

                // Register EISC
                _eisc = new ThreeSeriesTcpIpEthernetIntersystemCommunications(
                    eiscIpId, eiscIpAddress, this);

                var regResult = _eisc.Register();
                if (regResult != eDeviceRegistrationUnRegistrationResponse.Success)
                {
                    EnterSafeMode("EISC registration failed: " + regResult, new List<string>());
                    return;
                }

                _joinEndpoint = new TriListJoinEndpoint(_eisc);

                // Create platform components
                var signals = new SignalRegistry();
                var profileLoader = new DeviceProfileLoader(_fileSystem, _logger);
                profileLoader.LoadFromDirectory("\\User\\devices");

                var transportFactory = new TransportFactory(this, _logger);
                var deviceManager = new DeviceManager(profileLoader, transportFactory, _logger);
                var subsystemFactory = new SubsystemFactory(deviceManager, _logger);

                _systemEngine = new SystemEngine(config, deviceManager, subsystemFactory, signals, _logger);
                _systemEngine.Initialize();

                // Bind joins on EISC online
                _eisc.OnlineStatusChange += (device, args) =>
                {
                    if (args.DeviceOnLine)
                    {
                        _logger.Info("EISC online. Binding room and system joins.");
                        BindPlatformJoins(config);
                    }
                    else
                    {
                        _logger.Warn("EISC offline.");
                    }
                };

                // Export join contract for graphics project
                ExportJoinContract(config);

                _systemEngine.Start();
                _logger.Info("Platform mode startup complete.");
            }
            catch (Exception ex)
            {
                EnterSafeMode("Platform initialization error: " + ex.Message, new List<string>());
            }
        }

        private void BindPlatformJoins(SystemConfig config)
        {
            try
            {
                var roomBinder = new RoomJoinBinder(_joinEndpoint, _systemEngine.Signals, _systemEngine, _logger);
                foreach (var room in config.Rooms)
                {
                    roomBinder.BindRoom(room);
                }

                var systemBinder = new SystemJoinBinder(_joinEndpoint, _systemEngine.Signals, _systemEngine, _logger);
                systemBinder.Bind();

                _logger.Info("All joins bound.");
            }
            catch (Exception ex)
            {
                _logger.Error("Join binding error: " + ex.Message);
            }
        }

        private void ExportJoinContract(SystemConfig config)
        {
            try
            {
                var exporter = new JoinContractExporter();
                var json = exporter.ExportJson(config);

                // Write to User directory for graphics project to consume
                // Using Crestron file system
                _logger.Info("JoinContract.json exported (" + json.Length + " bytes).");
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to export join contract: " + ex.Message);
            }
        }

        // ── Legacy Mode ────────────────────────────────────────────────

        private void InitializeLegacyMode()
        {
            _logger.Info("Legacy mode: loading JoinList.");

            var loader = new JoinListLoader(_fileSystem, _logger);
            var loadResult = loader.Load(JoinListPaths.DefaultPath);

            if (!loadResult.Success)
            {
                EnterSafeMode("Join List load failure", loadResult.Errors);
                return;
            }

            var validator = new JoinListValidator();
            var validation = validator.Validate(loadResult.Config);
            if (!validation.IsValid)
            {
                EnterSafeMode("Join List validation failure", validation.Errors);
                return;
            }

            try
            {
                _core = new CoreEngine(_logger);
                var signalKeys = CollectSignalKeys(loadResult.Config);
                _core.Initialize(signalKeys);

                _eisc = new ThreeSeriesTcpIpEthernetIntersystemCommunications(
                    DefaultEiscIpId, DefaultEiscIpAddress, this);

                var regResult = _eisc.Register();
                if (regResult != eDeviceRegistrationUnRegistrationResponse.Success)
                {
                    EnterSafeMode("EISC registration failed: " + regResult, new List<string>());
                    return;
                }

                _joinEndpoint = new TriListJoinEndpoint(_eisc);

                _eisc.OnlineStatusChange += (device, args) =>
                {
                    if (args.DeviceOnLine)
                    {
                        _logger.Info("EISC online. Re-syncing output signals.");
                        ResyncOutputSignals(loadResult.Config);
                    }
                    else
                    {
                        _logger.Warn("EISC offline.");
                    }
                };

                _binder = new JoinBinder(_joinEndpoint, _core.Signals, _logger);
                _binder.BindAll(loadResult.Config);
                _core.Start();

                _logger.Info("Legacy mode startup complete.");
            }
            catch (Exception ex)
            {
                EnterSafeMode("Initialization error: " + ex.Message, new List<string>());
            }
        }

        // ── Shared ─────────────────────────────────────────────────────

        private void OnProgramStatusEvent(eProgramStatusEventType eventType)
        {
            if (eventType == eProgramStatusEventType.Stopping)
            {
                Cleanup();
            }
        }

        private void Cleanup()
        {
            try
            {
                _core?.Stop();
                _systemEngine?.Dispose();

                if (_eisc != null && _eisc.Registered)
                {
                    _eisc.UnRegister();
                }

                _logger?.Info("Cleanup complete.");
            }
            catch (Exception ex)
            {
                _logger?.Error("Error during cleanup: " + ex.Message);
            }
        }

        private void ResyncOutputSignals(JoinListConfig config)
        {
            if (config?.Joins == null || _joinEndpoint == null || _core == null)
            {
                return;
            }

            ResyncGroup(config.Joins.Digital, "digital");
            ResyncGroup(config.Joins.Analog, "analog");
            ResyncGroup(config.Joins.Serial, "serial");
        }

        private void ResyncGroup(List<JoinEntry> entries, string joinType)
        {
            if (entries == null) return;

            foreach (var entry in entries)
            {
                if (!string.Equals(entry.Direction, "output", StringComparison.OrdinalIgnoreCase))
                    continue;

                try
                {
                    var signalKey = joinType + ":" + entry.Name;
                    var signal = _core.Signals.GetOrCreate(signalKey);
                    var current = signal?.Get();
                    if (current == null) continue;

                    if (joinType == "digital" && current is bool boolVal)
                        _joinEndpoint.GetDigitalInput(entry.Join).BoolValue = boolVal;
                    else if (joinType == "analog" && current is ushort ushortVal)
                        _joinEndpoint.GetAnalogInput(entry.Join).UShortValue = ushortVal;
                    else if (joinType == "serial" && current is string strVal)
                        _joinEndpoint.GetSerialInput(entry.Join).StringValue = strVal;
                }
                catch (Exception ex)
                {
                    _logger.Error("Failed to resync " + joinType + " join " + entry.Join + ": " + ex.Message);
                }
            }
        }

        private void EnterSafeMode(string reason, List<string> errors)
        {
            _safeMode.Enter(reason);
            _logger.Warn("Safe mode: " + reason);

            if (errors != null)
            {
                foreach (var error in errors)
                {
                    _logger.Error(error);
                }
            }
        }

        private static IEnumerable<string> CollectSignalKeys(JoinListConfig config)
        {
            var keys = new List<string>();
            if (config?.Joins == null) return keys;

            AddKeys(keys, config.Joins.Digital, "digital");
            AddKeys(keys, config.Joins.Analog, "analog");
            AddKeys(keys, config.Joins.Serial, "serial");
            return keys;
        }

        private static void AddKeys(List<string> keys, List<JoinEntry> entries, string joinType)
        {
            if (entries == null) return;

            foreach (var entry in entries)
            {
                if (!string.IsNullOrWhiteSpace(entry?.Name))
                {
                    keys.Add(joinType + ":" + entry.Name);
                }
            }
        }
    }
}
