export interface Template {
  name: string;
  description: string;
  code: string;
}

export const TEMPLATES: Template[] = [
  {
    name: "Hello World",
    description: "Digital I/O with PUSH/RELEASE events and Print output",
    code: `#SYMBOL_NAME "Hello World"
#HINT "Basic power and mute control"
#CATEGORY "46" // Misc
#DEFAULT_VOLATILE
#ENABLE_STACK_CHECKING
#DEFINE_CONSTANT MAX_SOURCES 4

DIGITAL_INPUT power, mute;
DIGITAL_OUTPUT power_fb, mute_fb;
ANALOG_OUTPUT volume_fb;

INTEGER isPowered;

PUSH power
{
    isPowered = !isPowered;
    power_fb = isPowered;
    IF (isPowered)
    {
        Print("Power ON\\n");
        volume_fb = 32768;
    }
    ELSE
    {
        Print("Power OFF\\n");
        volume_fb = 0;
    }
}

PUSH mute
{
    mute_fb = 1;
    Print("Mute ON\\n");
}

RELEASE mute
{
    mute_fb = 0;
    Print("Mute OFF\\n");
}

Function Main()
{
    isPowered = 0;
    power_fb = 0;
    mute_fb = 0;
    volume_fb = 0;
    Print("Hello World module ready\\n");
}
`,
  },
  {
    name: "Volume Control",
    description: "Analog I/O with clamping, step increments, and constants",
    code: `#SYMBOL_NAME "Volume Control"
#HINT "Volume up/down with mute"
#CATEGORY "46"
#DEFAULT_VOLATILE
#DEFINE_CONSTANT VOL_STEP 3277
#DEFINE_CONSTANT VOL_MAX 65535
#DEFINE_CONSTANT VOL_MIN 0

DIGITAL_INPUT vol_up, vol_down, mute_toggle;
ANALOG_OUTPUT volume_level;
DIGITAL_OUTPUT mute_fb;

INTEGER currentVolume;
INTEGER isMuted;
INTEGER savedVolume;

PUSH vol_up
{
    IF (!isMuted)
    {
        currentVolume = currentVolume + VOL_STEP;
        IF (currentVolume > VOL_MAX)
            currentVolume = VOL_MAX;
        volume_level = currentVolume;
        Print("Volume: %d\\n", currentVolume);
    }
}

PUSH vol_down
{
    IF (!isMuted)
    {
        IF (currentVolume >= VOL_STEP)
            currentVolume = currentVolume - VOL_STEP;
        ELSE
            currentVolume = VOL_MIN;
        volume_level = currentVolume;
        Print("Volume: %d\\n", currentVolume);
    }
}

PUSH mute_toggle
{
    IF (isMuted)
    {
        isMuted = 0;
        mute_fb = 0;
        currentVolume = savedVolume;
        volume_level = currentVolume;
        Print("Unmuted, volume restored to %d\\n", currentVolume);
    }
    ELSE
    {
        isMuted = 1;
        mute_fb = 1;
        savedVolume = currentVolume;
        currentVolume = 0;
        volume_level = 0;
        Print("Muted\\n");
    }
}

Function Main()
{
    currentVolume = 32768;
    isMuted = 0;
    savedVolume = 0;
    volume_level = currentVolume;
    mute_fb = 0;
    Print("Volume Control ready, level=%d\\n", currentVolume);
}
`,
  },
  {
    name: "Source Selector",
    description: "SWITCH/CASE, string output, interlock pattern, function calls",
    code: `#SYMBOL_NAME "Source Selector"
#HINT "4-source selector with interlock"
#CATEGORY "46"
#DEFAULT_VOLATILE
#ENABLE_STACK_CHECKING
#DEFINE_CONSTANT NUM_SOURCES 4

DIGITAL_INPUT select_1, select_2, select_3, select_4;
DIGITAL_OUTPUT fb_1, fb_2, fb_3, fb_4;
STRING_OUTPUT source_name;
ANALOG_OUTPUT active_source;

INTEGER currentSource;

Function ClearFeedbacks()
{
    fb_1 = 0;
    fb_2 = 0;
    fb_3 = 0;
    fb_4 = 0;
}

Function SelectSource(INTEGER src)
{
    ClearFeedbacks();
    currentSource = src;
    active_source = src;

    SWITCH (src)
    {
        CASE (1):
        {
            fb_1 = 1;
            source_name = "Cable TV";
            Print("Selected: Cable TV\\n");
        }
        CASE (2):
        {
            fb_2 = 1;
            source_name = "Blu-ray";
            Print("Selected: Blu-ray\\n");
        }
        CASE (3):
        {
            fb_3 = 1;
            source_name = "Apple TV";
            Print("Selected: Apple TV\\n");
        }
        CASE (4):
        {
            fb_4 = 1;
            source_name = "Chromecast";
            Print("Selected: Chromecast\\n");
        }
        DEFAULT:
        {
            source_name = "None";
            Print("No source selected\\n");
        }
    }
}

PUSH select_1 { SelectSource(1); }
PUSH select_2 { SelectSource(2); }
PUSH select_3 { SelectSource(3); }
PUSH select_4 { SelectSource(4); }

Function Main()
{
    currentSource = 0;
    active_source = 0;
    source_name = "None";
    ClearFeedbacks();
    Print("Source Selector ready (%d sources)\\n", NUM_SOURCES);
}
`,
  },
  {
    name: "String Processing",
    description: "String I/O, built-in string functions, CHANGE events",
    code: `#SYMBOL_NAME "String Processing"
#HINT "String manipulation utilities"
#CATEGORY "46"
#DEFAULT_VOLATILE

STRING_INPUT text_in;
STRING_OUTPUT text_upper, text_lower, text_reversed;
ANALOG_OUTPUT text_length;
STRING_OUTPUT char_report;

Function ReverseString(STRING source)
{
    STRING result[256];
    INTEGER i, sLen;

    sLen = Len(source);
    result = "";
    FOR (i = sLen TO 1 STEP -1)
    {
        result = result + Mid(source, i, 1);
    }
    text_reversed = result;
}

CHANGE text_in
{
    STRING input[256];
    INTEGER length;
    INTEGER spacePos;

    input = text_in;
    length = Len(input);
    text_length = length;

    text_upper = Upper(input);
    text_lower = Lower(input);

    ReverseString(input);

    Print("Input: \\"%s\\"\\n", input);
    Print("Length: %d\\n", length);
    Print("Upper: %s\\n", Upper(input));
    Print("Lower: %s\\n", Lower(input));

    spacePos = Find(" ", input);
    IF (spacePos > 0)
    {
        Print("First word: %s\\n", Left(input, spacePos - 1));
        Print("Rest: %s\\n", Mid(input, spacePos + 1, length));
    }

    IF (length > 0)
    {
        char_report = "First='" + Left(input, 1) + "' Last='" + Right(input, 1) + "'";
    }
    ELSE
    {
        char_report = "(empty)";
    }
}

Function Main()
{
    text_upper = "";
    text_lower = "";
    text_reversed = "";
    text_length = 0;
    char_report = "";
    Print("String Processing ready\\n");
    Print("Type text in the string input to process it\\n");
}
`,
  },
  {
    name: "Bitwise & Types",
    description: "LONG_INTEGER, SIGNED_INTEGER, BAND/BOR/BXOR, overflow, STRUCTURE",
    code: `#SYMBOL_NAME "Bitwise & Types Demo"
#HINT "Integer types and bitwise operations"
#CATEGORY "46"
#DEFAULT_VOLATILE

DIGITAL_INPUT run_test;
ANALOG_OUTPUT result_fb;
STRING_OUTPUT status_text;

INTEGER regVal;
LONG_INTEGER bigVal;
SIGNED_INTEGER signedVal;

STRUCTURE DeviceState
{
    INTEGER power;
    INTEGER input;
    STRING name[64];
};

DeviceState myDevice;

Function TestBitwise()
{
    INTEGER flags;
    INTEGER mask;
    INTEGER result;

    flags = 0xFF;
    mask = 0x0F;

    result = flags BAND mask;
    Print("0xFF BAND 0x0F = 0x%02X (%d)\\n", result, result);

    result = flags BOR 0x100;
    Print("0xFF BOR 0x100 = 0x%03X (%d)\\n", result, result);

    result = flags BXOR mask;
    Print("0xFF BXOR 0x0F = 0x%02X (%d)\\n", result, result);

    result = BNOT mask;
    Print("BNOT 0x0F = %d\\n", result);

    // Shift operations
    result = 1 << 8;
    Print("1 << 8 = %d\\n", result);
    result = 256 >> 4;
    Print("256 >> 4 = %d\\n", result);
}

Function TestTypes()
{
    // INTEGER: 0-65535 with wraparound
    regVal = 65535;
    Print("INTEGER max: %d\\n", regVal);
    regVal = regVal + 1;
    Print("INTEGER overflow (65535+1): %d\\n", regVal);

    // LONG_INTEGER: 0-4294967295
    bigVal = 100000;
    Print("LONG_INTEGER: %d\\n", bigVal);

    // SIGNED_INTEGER: -32768 to 32767
    signedVal = 32767;
    Print("SIGNED_INTEGER max: %d\\n", signedVal);

    // Structure access
    myDevice.power = 1;
    myDevice.input = 3;
    myDevice.name = "Living Room Display";
    Print("Device: %s, Power=%d, Input=%d\\n", myDevice.name, myDevice.power, myDevice.input);
}

PUSH run_test
{
    Print("=== Bitwise Operations ===\\n");
    TestBitwise();
    Print("\\n=== Type Ranges ===\\n");
    TestTypes();
    status_text = "Tests complete";
    result_fb = 1;
}

Function Main()
{
    regVal = 0;
    bigVal = 0;
    signedVal = 0;
    myDevice.power = 0;
    myDevice.input = 0;
    myDevice.name = "";
    result_fb = 0;
    status_text = "Ready";
    Print("Bitwise & Types Demo ready\\n");
    Print("Toggle run_test to execute\\n");
}
`,
  },
  {
    name: "Timer Demo",
    description: "DELAY sequences, PULSE, WAIT/CANCELWAIT timing",
    code: `#SYMBOL_NAME "Timer Demo"
#HINT "Timing operations with DELAY, PULSE, and WAIT"
#CATEGORY "46"
#DEFAULT_VOLATILE

DIGITAL_INPUT start_sequence, cancel_all;
DIGITAL_OUTPUT step1_fb, step2_fb, step3_fb, pulse_out;
STRING_OUTPUT timer_status;

PUSH start_sequence
{
    timer_status = "Starting sequence...";
    Print("=== Timer Sequence Started ===\\n");

    step1_fb = 1;
    Print("Step 1: ON\\n");
    timer_status = "Step 1 active";
    DELAY(100);   // 1 second

    step2_fb = 1;
    Print("Step 2: ON (after 1s delay)\\n");
    timer_status = "Step 2 active";
    DELAY(100);   // 1 more second

    step3_fb = 1;
    Print("Step 3: ON (after 2s total)\\n");
    timer_status = "All steps complete";

    // PULSE: turn on then auto-off
    Print("Pulsing output for 0.5s...\\n");
    PULSE(50, pulse_out);

    Print("=== Sequence Complete ===\\n");
}

PUSH cancel_all
{
    CANCELALLWAIT();
    step1_fb = 0;
    step2_fb = 0;
    step3_fb = 0;
    timer_status = "Cancelled";
    Print("All timers cancelled\\n");
}

Function Main()
{
    step1_fb = 0;
    step2_fb = 0;
    step3_fb = 0;
    timer_status = "Ready";
    Print("Timer Demo ready\\n");
    Print("Toggle start_sequence to begin\\n");
}
`,
  },
  {
    name: "Array Processing",
    description: "Array I/O, CHANGE + GetLastModifiedArrayIndex, 2D matrix",
    code: `#SYMBOL_NAME "Array Processing"
#HINT "Array operations and change tracking"
#CATEGORY "46"
#DEFAULT_VOLATILE

ANALOG_INPUT levels[4];
ANALOG_OUTPUT level_fb[4];
STRING_OUTPUT array_status;

INTEGER matrix[3][3];

CHANGE levels
{
    INTEGER idx;
    INTEGER val;

    idx = GetLastModifiedArrayIndex(levels);
    val = levels[idx];
    level_fb[idx] = val;
    Print("levels[%d] changed to %d\\n", idx, val);
    array_status = "Last changed: index " + Itoa(idx);
}

Function Main()
{
    INTEGER i, j;

    // Init feedback
    FOR (i = 1 TO 4)
    {
        level_fb[i] = 0;
    }

    // Fill 3x3 identity matrix
    Print("=== 3x3 Identity Matrix ===\\n");
    FOR (i = 0 TO 2)
    {
        FOR (j = 0 TO 2)
        {
            IF (i = j)
                matrix[i][j] = 1;
            ELSE
                matrix[i][j] = 0;
        }
    }

    // Print matrix
    FOR (i = 0 TO 2)
    {
        Print("[ %d  %d  %d ]\\n", matrix[i][0], matrix[i][1], matrix[i][2]);
    }

    array_status = "Ready - adjust analog inputs";
    Print("Array Processing ready\\n");
}
`,
  },
  {
    name: "String Parsing",
    description: "GatherAsync serial protocol, ClearBuffer, GetC, #IF_DEFINED",
    code: `#SYMBOL_NAME "String Parsing"
#HINT "Serial protocol parsing with gather"
#CATEGORY "46"
#DEFAULT_VOLATILE
#DEFINE_CONSTANT DELIMITER "\\x0D"
#DEFINE_CONSTANT MAX_LEN 255

#IF_DEFINED DELIMITER
// Delimiter is defined — using carriage return
#ENDIF

BUFFER_INPUT serial_rx;
STRING_OUTPUT parsed_cmd;
STRING_OUTPUT parsed_value;
ANALOG_OUTPUT msg_count;

INTEGER msgCounter;

CHANGE serial_rx
{
    STRING temp[255];
    INTEGER colonPos;

    // Simple protocol: "CMD:VALUE\\r"
    temp = serial_rx;
    Print("Received %d bytes: \\"%s\\"\\n", Len(temp), temp);

    colonPos = Find(":", temp);
    IF (colonPos > 0)
    {
        parsed_cmd = Left(temp, colonPos - 1);
        parsed_value = Mid(temp, colonPos + 1, Len(temp));
        Print("Command: %s\\n", parsed_cmd);
        Print("Value: %s\\n", parsed_value);
    }
    ELSE
    {
        parsed_cmd = temp;
        parsed_value = "";
        Print("Raw command: %s\\n", temp);
    }

    msgCounter = msgCounter + 1;
    msg_count = msgCounter;
    ClearBuffer(serial_rx);
}

Function Main()
{
    msgCounter = 0;
    msg_count = 0;
    parsed_cmd = "";
    parsed_value = "";
    Print("String Parsing ready\\n");
    Print("Type \\\"CMD:VALUE\\\" in serial_rx input\\n");
}
`,
  },
  {
    name: "Scheduler",
    description: "Date/time functions with WAIT-based scheduling",
    code: `#SYMBOL_NAME "Scheduler"
#HINT "Daily schedule with date/time functions"
#CATEGORY "46"
#DEFAULT_VOLATILE

DIGITAL_INPUT check_schedule;
DIGITAL_OUTPUT morning_mode, evening_mode, night_mode;
STRING_OUTPUT current_time, current_date, current_day;
ANALOG_OUTPUT current_hour;

Function UpdateTimeDisplay()
{
    current_time = TIME();
    current_date = DATE();
    current_day = DAY();
    current_hour = GetHourNum();

    Print("Time: %s\\n", current_time);
    Print("Date: %s\\n", current_date);
    Print("Day:  %s\\n", current_day);
    Print("Hour: %d, Min: %d, Sec: %d\\n", GetHourNum(), GetMinutesNum(), GetSecondsNum());
    Print("Month: %d, Day: %d, Year: %d\\n", GetMonthNum(), GetDateNum(), GetYearNum());
}

Function CheckSchedule()
{
    INTEGER hour;

    hour = GetHourNum();
    Print("\\nChecking schedule for hour %d...\\n", hour);

    morning_mode = 0;
    evening_mode = 0;
    night_mode = 0;

    IF (hour >= 6 AND hour < 12)
    {
        morning_mode = 1;
        Print("Mode: MORNING\\n");
    }
    ELSE IF (hour >= 12 AND hour < 22)
    {
        evening_mode = 1;
        Print("Mode: EVENING\\n");
    }
    ELSE
    {
        night_mode = 1;
        Print("Mode: NIGHT\\n");
    }
}

PUSH check_schedule
{
    UpdateTimeDisplay();
    CheckSchedule();
}

Function Main()
{
    morning_mode = 0;
    evening_mode = 0;
    night_mode = 0;
    Print("Scheduler ready\\n");
    Print("System: %s (#%d)\\n", SYSTEM_NAME, SYSTEM_NUMBER);
    UpdateTimeDisplay();
    CheckSchedule();
}
`,
  },
  {
    name: "File Logger",
    description: "Virtual filesystem: FileOpen, FileWrite, FileRead, FindFirst",
    code: `#SYMBOL_NAME "File Logger"
#HINT "Timestamped file logging with read-back"
#CATEGORY "46"
#DEFAULT_VOLATILE

DIGITAL_INPUT write_log, read_log, list_files;
STRING_INPUT log_message;
STRING_OUTPUT last_read, file_list;
ANALOG_OUTPUT log_count;

INTEGER logCounter;
INTEGER fileHandle;

Function WriteLogEntry(STRING msg)
{
    STRING line[256];
    STRING timestamp[32];

    timestamp = TIME();
    line = "[" + timestamp + "] " + msg + "\\x0D\\x0A";

    fileHandle = FileOpen("/USER/APP.LOG", 3);
    IF (fileHandle >= 0)
    {
        FileWrite(fileHandle, line);
        FileClose(fileHandle);
        logCounter = logCounter + 1;
        log_count = logCounter;
        Print("Wrote log #%d: %s\\n", logCounter, msg);
    }
    ELSE
    {
        Print("Error opening log file\\n");
    }
}

PUSH write_log
{
    IF (Len(log_message) > 0)
        WriteLogEntry(log_message);
    ELSE
        WriteLogEntry("Manual log entry #" + Itoa(logCounter + 1));
}

PUSH read_log
{
    STRING buffer[1024];
    INTEGER bytesRead;
    INTEGER fh;

    fh = FileOpen("/USER/APP.LOG", 1);
    IF (fh >= 0)
    {
        bytesRead = FileRead(fh, buffer, 1024);
        FileClose(fh);
        last_read = buffer;
        Print("Read %d bytes from log:\\n%s\\n", bytesRead, buffer);
    }
    ELSE
    {
        last_read = "(no log file)";
        Print("No log file found\\n");
    }
}

PUSH list_files
{
    STRING fileName[64];
    INTEGER session;
    STRING listing[512];

    listing = "Files in /USER:\\n";
    session = FindFirst("*", "/USER", fileName);
    IF (session >= 0)
    {
        listing = listing + "  " + fileName + "\\n";
        fileName = FindNext(session);
        WHILE (Len(fileName) > 0)
        {
            listing = listing + "  " + fileName + "\\n";
            fileName = FindNext(session);
        }
        FindClose(session);
    }
    ELSE
    {
        listing = listing + "  (empty)\\n";
    }
    file_list = listing;
    Print("%s", listing);
}

Function Main()
{
    logCounter = 0;
    log_count = 0;
    last_read = "";
    file_list = "";

    MakeDirectory("/USER");
    Print("File Logger ready\\n");
    Print("Toggle write_log to write entries\\n");
    Print("Toggle read_log to read the log\\n");
    Print("Toggle list_files to list directory\\n");
}
`,
  },
  {
    name: "TCP Client",
    description: "Virtual network: SocketConnectTCP, SocketSend, socket events",
    code: `#SYMBOL_NAME "TCP Client"
#HINT "Connect to simulated projector via TCP"
#CATEGORY "46"
#DEFAULT_VOLATILE

DIGITAL_INPUT connect_btn, disconnect_btn;
DIGITAL_INPUT send_pwr_on, send_pwr_off, send_input_hdmi1, send_query;
STRING_OUTPUT connection_status, last_response;
ANALOG_OUTPUT socket_state;

INTEGER socketId;

Function SendCommand(STRING cmd)
{
    INTEGER status;
    status = SocketGetStatus(socketId);
    IF (status = 2)
    {
        SocketSend(socketId, cmd + "\\x0D");
        Print("TX: %s\\n", cmd);
    }
    ELSE
    {
        Print("Not connected (status=%d)\\n", status);
    }
}

PUSH connect_btn
{
    Print("Connecting to Projector Sim (192.168.1.101:23)...\\n");
    connection_status = "Connecting...";
    socketId = SocketConnectTCP("192.168.1.101", 23);
    socket_state = 1;
}

PUSH disconnect_btn
{
    SocketDisconnect(socketId);
    connection_status = "Disconnected";
    socket_state = 0;
    Print("Disconnected\\n");
}

PUSH send_pwr_on     { SendCommand("PWR ON"); }
PUSH send_pwr_off    { SendCommand("PWR OFF"); }
PUSH send_input_hdmi1 { SendCommand("INPUT HDMI1"); }
PUSH send_query      { SendCommand("LAMP?"); }

Function Main()
{
    socketId = 0;
    socket_state = 0;
    connection_status = "Idle";
    last_response = "";
    Print("TCP Client ready\\n");
    Print("Available simulators:\\n");
    Print("  Echo Server:    192.168.1.100:23\\n");
    Print("  Projector Sim:  192.168.1.101:23\\n");
    Print("  Display Sim:    192.168.1.102:4660\\n");
    Print("Toggle connect_btn to connect\\n");
}
`,
  },
];
