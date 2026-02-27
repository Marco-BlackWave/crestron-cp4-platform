import { CrestronElement, Join, JoinType } from '../types/crestron';

interface JoinConfigProps {
  element: CrestronElement;
  updateElement: (updates: Partial<CrestronElement>) => void;
}

export function JoinConfig({ element, updateElement }: JoinConfigProps) {
  const updateJoin = (joinKey: string, updates: Partial<Join> | null) => {
    // Ensure element.joins exists
    const currentJoins = element.joins || {};
    
    if (updates === null) {
      const newJoins = { ...currentJoins };
      delete newJoins[joinKey as keyof typeof newJoins];
      updateElement({ joins: newJoins });
    } else {
      updateElement({
        joins: {
          ...currentJoins,
          [joinKey]: {
            ...(currentJoins[joinKey as keyof typeof currentJoins] || {}),
            ...updates,
          },
        },
      });
    }
  };

  const renderJoinInput = (
    label: string,
    joinKey: string,
    defaultType: JoinType,
    description?: string
  ) => {
    // Safety check: get joins safely
    const joins = element.joins || {};
    const join = joins[joinKey as keyof typeof joins];
    const hasJoin = !!join;

    return (
      <div className="p-3 bg-zinc-800 rounded">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm">{label}</label>
          <input
            type="checkbox"
            checked={hasJoin}
            onChange={(e) => {
              if (e.target.checked) {
                updateJoin(joinKey, { type: defaultType, number: 1 });
              } else {
                updateJoin(joinKey, null);
              }
            }}
            className="w-4 h-4"
          />
        </div>

        {hasJoin && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Type</label>
                <select
                  value={join?.type || defaultType}
                  onChange={(e) =>
                    updateJoin(joinKey, { type: e.target.value as JoinType })
                  }
                  className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
                >
                  <option value="digital">Digital</option>
                  <option value="analog">Analog</option>
                  <option value="serial">Serial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Join #</label>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={join?.number || 1}
                  onChange={(e) =>
                    updateJoin(joinKey, { number: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Description</label>
              <input
                type="text"
                value={join?.description || ''}
                onChange={(e) =>
                  updateJoin(joinKey, { description: e.target.value })
                }
                placeholder={description}
                className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-3">
      {element.type === 'button' && (
        <>
          {renderJoinInput('Press Join', 'press', 'digital', 'Button pressed')}
          {renderJoinInput('Release Join', 'release', 'digital', 'Button released')}
          {renderJoinInput('Feedback Join', 'feedback', 'digital', 'Button state feedback')}
        </>
      )}

      {element.type === 'slider' && (
        <>
          {renderJoinInput('Value Join', 'value', 'analog', 'Slider value (0-65535)')}
          {renderJoinInput('Feedback Join', 'feedback', 'analog', 'Slider position feedback')}
        </>
      )}

      {element.type === 'gauge' && (
        <>
          {renderJoinInput('Value Join', 'value', 'analog', 'Gauge value')}
        </>
      )}

      {element.type === 'text' && (
        <>
          {renderJoinInput('Text Join', 'text', 'serial', 'Dynamic text content')}
        </>
      )}

      {element.type === 'image' && (
        <>
          {renderJoinInput('Image Join', 'text', 'serial', 'Dynamic image URL')}
        </>
      )}

      {element.type === 'list' && (
        <>
          {renderJoinInput('Select Join', 'press', 'digital', 'Item selected')}
          {renderJoinInput('Data Join', 'text', 'serial', 'List data (JSON)')}
        </>
      )}

      {element.type === 'subpage' && (
        <>
          {renderJoinInput('Show Join', 'feedback', 'digital', 'Show/hide subpage')}
        </>
      )}

      {/* Advanced Components */}
      {element.type === 'thermostat' && (
        <>
          {renderJoinInput('Temperature Value', 'tempValue', 'analog', 'Current temperature (0-65535)')}
          {renderJoinInput('Setpoint Value', 'setpointValue', 'analog', 'Target temperature (0-65535)')}
          {renderJoinInput('Mode Press', 'modePress', 'digital', 'Change mode button')}
          {renderJoinInput('Fan Press', 'fanPress', 'digital', 'Change fan button')}
          {renderJoinInput('Temp Up Press', 'tempUpPress', 'digital', 'Increase temperature')}
          {renderJoinInput('Temp Down Press', 'tempDownPress', 'digital', 'Decrease temperature')}
          {renderJoinInput('Mode Feedback', 'modeFeedback', 'serial', 'Current mode (heat/cool/auto/off)')}
          {renderJoinInput('Fan Feedback', 'fanFeedback', 'serial', 'Current fan mode (auto/on)')}
        </>
      )}

      {element.type === 'mini-thermostat' && (
        <>
          {renderJoinInput('Temperature Value', 'tempValue', 'analog', 'Current temperature')}
          {renderJoinInput('Setpoint Value', 'setpointValue', 'analog', 'Target temperature')}
          {renderJoinInput('Temp Up Press', 'tempUpPress', 'digital', 'Increase temperature')}
          {renderJoinInput('Temp Down Press', 'tempDownPress', 'digital', 'Decrease temperature')}
        </>
      )}

      {element.type === 'fan' && (
        <>
          {renderJoinInput('Power Press', 'powerPress', 'digital', 'Power on/off')}
          {renderJoinInput('Speed Press', 'speedPress', 'digital', 'Change speed')}
          {renderJoinInput('Power Feedback', 'powerFeedback', 'digital', 'Power state')}
          {renderJoinInput('Speed Feedback', 'speedFeedback', 'serial', 'Current speed (low/med/high)')}
        </>
      )}

      {element.type === 'volume-control' && (
        <>
          {renderJoinInput('Volume Value', 'volumeValue', 'analog', 'Volume level (0-65535)')}
          {renderJoinInput('Volume Up Press', 'volumeUpPress', 'digital', 'Increase volume')}
          {renderJoinInput('Volume Down Press', 'volumeDownPress', 'digital', 'Decrease volume')}
          {renderJoinInput('Mute Press', 'mutePress', 'digital', 'Toggle mute')}
          {renderJoinInput('Mute Feedback', 'muteFeedback', 'digital', 'Mute state')}
        </>
      )}

      {element.type === 'dimmer' && (
        <>
          {renderJoinInput('Brightness Value', 'brightnessValue', 'analog', 'Brightness level (0-65535)')}
          {renderJoinInput('Power Press', 'powerPress', 'digital', 'Power on/off')}
          {renderJoinInput('Brightness Up Press', 'brightnessUpPress', 'digital', 'Increase brightness')}
          {renderJoinInput('Brightness Down Press', 'brightnessDownPress', 'digital', 'Decrease brightness')}
          {renderJoinInput('Power Feedback', 'powerFeedback', 'digital', 'Power state')}
        </>
      )}

      {element.type === 'door-lock' && (
        <>
          {renderJoinInput('Lock Press', 'lockPress', 'digital', 'Lock door')}
          {renderJoinInput('Unlock Press', 'unlockPress', 'digital', 'Unlock door')}
          {renderJoinInput('Lock Feedback', 'lockFeedback', 'digital', 'Lock state (locked/unlocked)')}
          {renderJoinInput('Status Text', 'statusText', 'serial', 'Status message')}
        </>
      )}

      {element.type === 'humidity' && (
        <>
          {renderJoinInput('Humidity Value', 'humidityValue', 'analog', 'Current humidity (0-65535)')}
          {renderJoinInput('Target Value', 'targetValue', 'analog', 'Target humidity (0-65535)')}
          {renderJoinInput('Humidity Up Press', 'humidityUpPress', 'digital', 'Increase target')}
          {renderJoinInput('Humidity Down Press', 'humidityDownPress', 'digital', 'Decrease target')}
        </>
      )}

      {element.type === 'media-player' && (
        <>
          {renderJoinInput('Play Press', 'playPress', 'digital', 'Play button')}
          {renderJoinInput('Pause Press', 'pausePress', 'digital', 'Pause button')}
          {renderJoinInput('Stop Press', 'stopPress', 'digital', 'Stop button')}
          {renderJoinInput('Next Press', 'nextPress', 'digital', 'Next track')}
          {renderJoinInput('Previous Press', 'prevPress', 'digital', 'Previous track')}
          {renderJoinInput('Volume Value', 'volumeValue', 'analog', 'Volume level')}
          {renderJoinInput('Progress Value', 'progressValue', 'analog', 'Playback progress')}
          {renderJoinInput('Title Text', 'titleText', 'serial', 'Current title')}
          {renderJoinInput('Artist Text', 'artistText', 'serial', 'Current artist')}
          {renderJoinInput('Status Feedback', 'statusFeedback', 'serial', 'Playback status')}
        </>
      )}

      {element.type === 'audio-zone' && (
        <>
          {renderJoinInput('Power Press', 'powerPress', 'digital', 'Zone power')}
          {renderJoinInput('Volume Value', 'volumeValue', 'analog', 'Volume level')}
          {renderJoinInput('Source Press', 'sourcePress', 'digital', 'Change source')}
          {renderJoinInput('Mute Press', 'mutePress', 'digital', 'Toggle mute')}
          {renderJoinInput('Power Feedback', 'powerFeedback', 'digital', 'Power state')}
          {renderJoinInput('Source Text', 'sourceText', 'serial', 'Current source name')}
          {renderJoinInput('Mute Feedback', 'muteFeedback', 'digital', 'Mute state')}
        </>
      )}

      {element.type === 'security-panel' && (
        <>
          {renderJoinInput('Arm Home Press', 'armHomePress', 'digital', 'Arm home')}
          {renderJoinInput('Arm Away Press', 'armAwayPress', 'digital', 'Arm away')}
          {renderJoinInput('Disarm Press', 'disarmPress', 'digital', 'Disarm')}
          {renderJoinInput('Status Feedback', 'statusFeedback', 'serial', 'System status')}
          {renderJoinInput('Zone Status', 'zoneStatus', 'serial', 'Zone status (JSON)')}
          {renderJoinInput('Alarm Feedback', 'alarmFeedback', 'digital', 'Alarm active')}
        </>
      )}

      {element.type === 'tv-remote' && (
        <>
          {renderJoinInput('Power Press', 'powerPress', 'digital', 'Power on/off')}
          {renderJoinInput('Vol Up Press', 'volUpPress', 'digital', 'Volume up')}
          {renderJoinInput('Vol Down Press', 'volDownPress', 'digital', 'Volume down')}
          {renderJoinInput('Ch Up Press', 'chUpPress', 'digital', 'Channel up')}
          {renderJoinInput('Ch Down Press', 'chDownPress', 'digital', 'Channel down')}
          {renderJoinInput('Mute Press', 'mutePress', 'digital', 'Toggle mute')}
          {renderJoinInput('Menu Press', 'menuPress', 'digital', 'Menu button')}
          {renderJoinInput('Back Press', 'backPress', 'digital', 'Back button')}
          {renderJoinInput('Up Press', 'upPress', 'digital', 'Navigate up')}
          {renderJoinInput('Down Press', 'downPress', 'digital', 'Navigate down')}
          {renderJoinInput('Left Press', 'leftPress', 'digital', 'Navigate left')}
          {renderJoinInput('Right Press', 'rightPress', 'digital', 'Navigate right')}
          {renderJoinInput('OK Press', 'okPress', 'digital', 'OK/Select button')}
          {renderJoinInput('Number Press', 'numberPress', 'analog', 'Number pad (0-9)')}
        </>
      )}

      {element.type === 'keypad' && (
        <>
          {renderJoinInput('Key Press', 'keyPress', 'serial', 'Key pressed value')}
          {renderJoinInput('Enter Press', 'enterPress', 'digital', 'Enter/Submit button')}
          {renderJoinInput('Clear Press', 'clearPress', 'digital', 'Clear button')}
          {renderJoinInput('Display Text', 'displayText', 'serial', 'Display feedback')}
        </>
      )}

      <div className="pt-2 text-xs text-zinc-500">
        <p className="mb-1">Join Types:</p>
        <ul className="list-disc list-inside space-y-1 text-zinc-400">
          <li>Digital: Boolean (true/false)</li>
          <li>Analog: Number (0-65535)</li>
          <li>Serial: Text string</li>
        </ul>
      </div>
    </div>
  );
}