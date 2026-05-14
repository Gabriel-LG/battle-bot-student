
/**
 * BattleBot Extension for micro:bit
 * Provides blocks for controlling battle robots with motors, servos, sensors, and wireless controllers.
 */
//% weight=100 color=#EE7202 icon="\uf3ed"
//% block="BattleBot"
//% groups=["hoi", "Driving", "Controller", "Servos", "Sensors", "Lights", "Victory"]
namespace battle_bot {

    /**
     * Enter your controller number here.
     */
    //% block="connect to controller %id"
    //% id.min=0 id.max=15
    export function initBattleBot(id: number): void {
        radio.setGroup(0);
        radio.setFrequencyBand(id * 5);

        radio.onReceivedBuffer((buffer: Buffer) => {
            let id = buffer.getUint8(0);
            if (id == 0x43 /*'C'*/) handleControllerUpdate(buffer);
            if (id == 0x54 /*'T'*/) handleTeacherUpdate(buffer);

        });

        // install the pin edge event handlers for the line sensors.
        pins.setPull(DigitalPin.P13, PinPullMode.PullUp);
        pins.setEvents(DigitalPin.P13, PinEventType.Edge);
        control.onEvent(control.eventSourceId(EventBusSource.MICROBIT_ID_IO_P13), control.eventValueId(EventBusValue.MICROBIT_PIN_EVT_RISE), () => {
            lineSensorLeftHandler.setState(true);
        });
        control.onEvent(control.eventSourceId(EventBusSource.MICROBIT_ID_IO_P13), control.eventValueId(EventBusValue.MICROBIT_PIN_EVT_FALL), () => {
            lineSensorLeftHandler.setState(false);
        });
        pins.setPull(DigitalPin.P14, PinPullMode.PullUp);
        pins.setEvents(DigitalPin.P14, PinEventType.Edge);
        control.onEvent(control.eventSourceId(EventBusSource.MICROBIT_ID_IO_P14), control.eventValueId(EventBusValue.MICROBIT_PIN_EVT_RISE), () => {
            lineSensorRightHandler.setState(true);
        });
        control.onEvent(control.eventSourceId(EventBusSource.MICROBIT_ID_IO_P14), control.eventValueId(EventBusValue.MICROBIT_PIN_EVT_FALL), () => {
            lineSensorRightHandler.setState(false);
        });

        control.runInParallel(backGroundTask);
        started = true;
    }

    /**
     * Set how fast a motor spins.
     */
    //% block="set %motor motor speed to %speed \\%"
    //% group="Driving"
    //% speed.min=-100 speed.max=100 speed.defl=0
    export function setMotorSpeed(motor: Motor, speed: number) {
        // Apply speed-to-power conversion for smooth movement
        const power = speedToPower(speed);
        setMotorRawPower(motor, power);
    }

    /**
     * Set motor power directly without conversion. For advanced users.
     */
    //% block="set %motor motor raw power to %power \\%"
    //% group="Driving"
    //% power.min=-100 power.max=100 power.defl=0
    //% advanced=true
    export function setMotorRawPower(motor: Motor, power: number) {
        if (motor != Motor.Left && motor != Motor.Right) return; //sanity check
        
        if (blockDrive) power = 0;

        let buf = pins.createBuffer(3);
        buf[0] = <uint8>motor;
        buf[1] = power > 0 ? 0 : 1;
        buf[2] = <uint8>Math.clamp(0, 255, Math.abs(power) * 255 / 100);
        
        for (let retries = 0; retries < 3; retries++)
        {
            if(pins.i2cWriteBuffer(0x10, buf) == 0) break;
        }
    }

    /**
     * Convert a speed value to motor power for smooth movement. For advanced users.
     */
    //% block="convert %speed \\% speed to power \\%"
    //% group="Driving"
    //% speed.min=-100 speed.max=100
    //% advanced=true
    export function speedToPower(speed: number): number {
        const s = Math.clamp(0, 1, Math.abs(speed) / 100);

        // Algebraically solved inverse of the saturation curve:
        // s = ( 1.04 * Math.power(power, 1.85) ) / ( 0.04 + Math.power(power, 1.85) )
        let power = Math.pow(0.04, 1 / 1.85) * Math.pow(s / (1.04 - s), 1 / 1.85);

        // Standard safety and deadzone
        if (power > 1) power = 1;
        if (power < 0.1) return 0;

        return (speed < 0 ? -power : power) * 100;
    }

    /**
     * Calculate how fast the motor should spin based on the joystick position.
     */
    //% block="calculate %motor motor speed using %stickX and %stickY"
    //% group="Driving"
    //% stickX.min=-100 stickX.max=100
    //% stickY.min=-100 stickY.max=100
    //% stickX.shadow="battle_bot_getStickX"
    //% stickY.shadow="battle_bot_getStickY"
    export function calculateMotorSpeed(motor: Motor, stickX: number, stickY: number): number {
        // Convert percentages to scalars for math
        let x = stickX / 100;
        let y = stickY / 100;
        
        let magnitude = Math.clamp(0, 1, Math.sqrt(x * x + y * y));
        let angle = Math.atan2(x, Math.abs(y)) / (Math.PI / 2);

        let leftSpeed: number = 0;
        let rightSpeed: number = 0;

        //relinearize the angle
        if (Math.abs(angle) < 0.75) {
            angle = angle / 0.75 / 2;
        }
        else if (angle > 0) {
            angle = 1 - (1 - angle) / 0.25 / 2;
        }
        else //if(angle < 0)
        {
            angle = -1 + (1 + angle) / 0.25 / 2;
        }

        if (y >= 0) //forward
        {
            leftSpeed = magnitude + magnitude * angle * 2;
            rightSpeed = magnitude - magnitude * angle * 2;
        }
        else //reverse
        {
            leftSpeed = -magnitude + magnitude * angle * 2;
            rightSpeed = -magnitude - magnitude * angle * 2;
        }

        // Convert back to percentage
        if (motor == Motor.Left) return leftSpeed * 100;
        else return rightSpeed * 100;
    }

    /**
     * Do something when a controller button is pressed or released.
     */
    //% block="when button %button is %state"
    //% group="Controller"
    export function onButtonPress(button: Button, state: ButtonState, handler: () => void): void {
        if (state == ButtonState.pressed) buttonHandlers[button].setHandler = handler;
        if (state == ButtonState.released) buttonHandlers[button].clearHandler = handler;
    }

    /**
     * Get the joystick position. Returns -100 to 100 where 0 is the center position.
     */
    //% blockId=battle_bot_getStick
    //% block="joystick %axis"
    //% group="Controller"
    export function getStick(axis: StickAxis): number {
        if (axis == StickAxis.X) return stickX * 100;
        if (axis == StickAxis.Y) return stickY * 100;
        return undefined;
    }

    //% blockHidden=true
    //% blockId=battle_bot_getStickX
    //% block="joystick X"
    //% group="Controller"
    export function _getStickX(): number {
        return getStick(StickAxis.X);
    }

    //% blockHidden=true
    //% blockId=battle_bot_getStickY
    //% block="joystick Y"
    //% group="Controller"
    export function _getStickY(): number {
        return getStick(StickAxis.Y);
    }

    /**
     * Check if a controller button is being pressed right now.
     */
    //% block="button %button is pressed"
    //% group="Controller"
    export function getButtonState(button: Button): boolean {
        return buttonHandlers[button].getState();
    }

    /**
     * Move a servo to a position (0° to 180°).
     */
    //% block="move servo %servo to %angle °"
    //% group=Servos
    //% angle.min=0 angle.max=180 angle.defl=90
    export function moveServo(servo: AllServos, angle: number): void
    {
        if(angle > 180) angle = 180;
        if(angle < 0) angle = 0;

        switch(servo)
        {
            case AllServos.S1:
            case AllServos.S2:
                moveMaqueenServo(servo, angle)
                break;
            case AllServos.P0:
                pins.servoWritePin(AnalogPin.P0, angle)
                break;
            case AllServos.P1:
                pins.servoWritePin(AnalogPin.P1, angle)
                break;
            case AllServos.P2:
                pins.servoWritePin(AnalogPin.P2, angle)
                break;
            default:
                return;
        }

        servoPositions[servo] = angle;
    }

    /**
     * Get the current position of a servo (0° to 180°).
     */
    //% block="servo %servo position"
    //% group=Servos
    export function servoPosition(servo: AllServos): number
    {
        return servoPositions[servo];
    }

    /**
     * Turn off the servo so you can move it by hand.
     */
    //% block="disable servo %servo"
    //% group=Servos
    export function disableServo(servo: MicrobitServos)
    {
        switch(servo)
        {
            case MicrobitServos.P0:
                pins.digitalWritePin(DigitalPin.P0, 0);
                break;
            case MicrobitServos.P1:
                pins.digitalWritePin(DigitalPin.P1, 0);
                break;
            case MicrobitServos.P2:
                pins.digitalWritePin(DigitalPin.P2, 0);
                break;
        }
    }

    /**
     * Internal helper: Send servo angle command to Maqueen motor driver via I2C.
     * 
     * @param index Servo identifier (S1 or S2)
     * @param angle Target angle in degrees (0-180)
     */
    function moveMaqueenServo(index: AllServos, angle: number): void {
        let buf = pins.createBuffer(2);
        if (index == AllServos.S1) {
            buf[0] = 0x14;
        }
        if (index == AllServos.S2) {
            buf[0] = 0x15;
        }
        buf[1] = angle;
        pins.i2cWriteBuffer(0x10, buf);
    }
    


    /* **************** copied from DFRobot Maqueen extension ****************** */
    let state1 = 0;
    
    /**
     * Measure distance using the ultrasonic sensor. Returns distance in centimeters (or 500 if nothing detected).
     */
    //% blockId=ultrasonic_sensor 
    //% block="read ultrasonic sensor in cm"
    //% group="Sensors"
    export function Ultrasonic(): number {
        let data;
        let i = 0;
        data = readUlt();
        if (state1 == 1 && data != 0) {
            state1 = 0;
        }
        if (data != 0) {
        } else {
            if (state1 == 0) {
                do {
                    data = readUlt();
                    i++;
                    if (i > 3) {
                        state1 = 1;
                        data = 500;
                        break;
                    }
                } while (data == 0)
            }
        }
        if (data == 0)
            data = 500
        return data;

    }
    
    /**
     * Internal helper: Perform ultrasonic distance measurement.
     * 
     * Sends trigger pulse on P1, reads echo pulse on P2.
     * Handles both high and low initial states of echo pin.
     * 
     * @returns Raw distance reading in custom units, or 0 on timeout
     */
    function readUlt(): number {
        let d
        pins.digitalWritePin(DigitalPin.P1, 1);
        basic.pause(1)
        pins.digitalWritePin(DigitalPin.P1, 0);
        if (pins.digitalReadPin(DigitalPin.P2) == 0) {
            pins.digitalWritePin(DigitalPin.P1, 0);
            pins.digitalWritePin(DigitalPin.P1, 1);
            basic.pause(20)
            pins.digitalWritePin(DigitalPin.P1, 0);
            d = pins.pulseIn(DigitalPin.P2, PulseValue.High, 500 * 58);//readPulseIn(1);
        } else {
            pins.digitalWritePin(DigitalPin.P1, 1);
            pins.digitalWritePin(DigitalPin.P1, 0);
            basic.pause(20)
            pins.digitalWritePin(DigitalPin.P1, 0);
            d = pins.pulseIn(DigitalPin.P2, PulseValue.Low, 500 * 58);//readPulseIn(0);
        }
        let x = d / 59;
        return Math.idiv(d, 2.54);
    }

    /* **************** end copied from DFRobot Maqueen extension ****************** */

    /**
     * Check if the line sensor sees a white surface.
     */
    //% block="%sensor line sensor detects line"
    //% group=Sensors
    export function readLineSensor(sensor: LineSensor): boolean {
        if (sensor == LineSensor.Left) {
            return pins.digitalReadPin(DigitalPin.P13) != 0;
        } else if (sensor == LineSensor.Right) {
            return pins.digitalReadPin(DigitalPin.P14) != 0;
        } else {
            return false;
        }
    }

    /**
     * Do something when the line sensor finds or loses a white surface.
     */
    //% block="when %sensor line sensor %event white"
    //% group=Sensors
    export function onLineSensor(sensor: LineSensor, event: LineSensorEvents, handler: ()=>void): void {
        //let event = line ? PinEvent.Rise : PinEvent.Fall;
        if (sensor == LineSensor.Left) {
            if(event == LineSensorEvents.Found) lineSensorLeftHandler.setHandler = handler;
            else if (event == LineSensorEvents.Lost) lineSensorLeftHandler.clearHandler = handler;
        } else if (sensor == LineSensor.Right) {
            if (event == LineSensorEvents.Found) lineSensorRightHandler.setHandler = handler;
            else if (event == LineSensorEvents.Lost) lineSensorRightHandler.clearHandler = handler;
        }
    }

    /**
     * Turn a front LED on or off.
     */
    //% block="set %led front LED %on"
    //% group=Lights
    //% on.shadow="toggleOnOff"
    export function frontLed(led: FrontLed, on: boolean): void {
        if (led == FrontLed.Left) pins.P8.digitalWrite(on);
        else if (led == FrontLed.Right) pins.P12.digitalWrite(on);
    }

    /**
     * Set up the (4) RGB LEDs. Use Neopixel to set colors
     */
    //% block="RGB lights"
    //% group=Lights
    //% blockSetVariable=strip
    export function initLeds(): neopixel.Strip {
        return neopixel.create(DigitalPin.P15, 4, NeoPixelMode.RGB);
    }

    /**
     * Test your victory celebration without needing to actually win.
     */
    //% block="test victory"
    //% group=Victory
    export function testVictory(): void {
        victoryHandler.setState(false);
        victoryHandler.setState(true);
    }


    /**
     * Do something when your robot wins! Make it dance, flash lights, or play sounds.
     */
    //% block="victory"
    //% group=Victory
    export function onVictory(handler: () => void): void {
        victoryHandler.setHandler = handler;
    }

    export enum Button {
        //% blockId="Controller button A" block="A"
        A = 0,
        //% blockId="Controller button B" block="B"
        B = 1,
        //% blockId="Controller button C" block="C"
        C = 2,
        //% blockId="Controller button D" block="D"
        D = 3,
        //% blockId="Controller button E" block="E"
        E = 4,
        //% blockId="Controller button F" block="F"
        F = 5,
        //% blockId="Controller Logo touched" block="Logo"
        Logo = 6
    }

    export enum ButtonState {
        //% blockId="Controller button pressed" block="Pressed"
        pressed = 0,
        //% blockId="Controller button released" block="Released"
        released = 1,
    }

    export enum StickAxis {
        //% blockId="Stick X Axis" block="X"
        X,
        //% blockId="Stick Y Axis" block="Y"
        Y,
    }

    export enum StickAxisAdvanced {
        //% blockId="Stick Magnitude" block="Magnitude"
        Magnitude,
        //% blockId="Stick angle" block="Angle"
        Angle,
    }

    export enum Motor {
        //% blockid="Left motor" block="left"
        Left = 0,
        //% blockid="Right motor" block="right"
        Right = 2,
    }

    export enum LineSensor {
        //% blockid="Left line sensor" block="left"
        Left = 0,
        //% blockid="Right line sensor" block="right"
        Right = 2,
    }

    export enum LineSensorEvents {
        //% blockid="Line lost" block="lost"
        Lost = 0,
        //% blockid="Line found" block="found"
        Found = 1,
    }

    export enum FrontLed {
        //% blockid="Front LED left" block="left"
        Left = 0,
        //% blockid="Front LED right" block="right"
        Right = 1,
    }

    export enum AllServos {
        //% blockid="Servo S1" block="S1"
        S1 = 0,
        //% blockid="Servo S2" block="S2"
        S2 = 1,
        //% blockid="Servo P0" block="P0"
        P0 = 2,
        //% blockid="Servo P1" block="P1"
        P1 = 3,
        //% blockid="Servo P2" block="P2"
        P2 = 4,
    }

    export enum MicrobitServos {
        //% blockid="Servo P0" block="P0"
        P0 = 2,
        //% blockid="Servo P1" block="P1"
        P1 = 3,
        //% blockid="Servo P2" block="P2"
        P2 = 4,
    }


    /**
     * BooleanStateHandler - Thread-safe state machine for boolean events
     * 
     * Manages state transitions and executes callbacks in parallel fibers.
     * Used throughout BattleBot for buttons, line sensors, and victory events.
     * 
     * Behavior:
     * - State false → true: calls setHandler
     * - State true → false: calls clearHandler
     * - No-op if state doesn't change
     * 
     * Concurrency guarantees:
     * - Handlers execute in parallel fibers (non-blocking)
     * - Only one handler active per instance at a time
     * - State changes during handler execution are deferred
     * - After handler completes, if state changed, opposite handler runs
     * 
     * This prevents race conditions and ensures handlers complete before
     * their counterpart runs.
     */
    class BooleanStateHandler {
        constructor() { }

        private state: boolean = false;
        setHandler: () => void = undefined;
        clearHandler: () => void = undefined;
        private handlerRunning: boolean = false;

        getState(): boolean
        {
            return this.state;
        }

        /**
         * Update state and trigger appropriate handler.
         * 
         * @param newState New state value
         */
        setState(newState: boolean): void {
            //no change, nothing to do
            if (newState == this.state) return;
            this.state = newState;
            if (this.handlerRunning) return; //already running a handler

            // set state
            if (newState && this.setHandler != undefined) {
                this.handlerRunning = true;
                control.runInParallel(() => {
                    //run the set handler
                    this.setHandler();
                    //if the state is cleared by now, run the clear handler
                    if (!this.state && this.clearHandler != undefined) this.clearHandler();
                    this.handlerRunning = false;
                });
            }

            // clear state
            if (!newState && this.clearHandler != undefined) {
                this.handlerRunning = true;
                control.runInParallel(() => {
                    //run clear handler
                    this.clearHandler();
                    //if the state is set by now, run the set handler
                    if (this.state && this.setHandler != undefined) this.setHandler();
                    this.handlerRunning = false;
                });
            }
        }
    }


    let started: boolean = false;

    let buttonHandlers: { [key: number]: BooleanStateHandler } =
    {
        [0]: new BooleanStateHandler,
        [1]: new BooleanStateHandler,
        [2]: new BooleanStateHandler,
        [3]: new BooleanStateHandler,
        [4]: new BooleanStateHandler,
        [5]: new BooleanStateHandler,
        [6]: new BooleanStateHandler,
        [7]: new BooleanStateHandler,
    };
    let stickX: number = 0;
    let stickY: number = 0;

    let lineSensorLeftHandler: BooleanStateHandler = new BooleanStateHandler;
    let lineSensorRightHandler: BooleanStateHandler = new BooleanStateHandler;

    let restoreVolume: number = 0;
    let blockSound: boolean = false;
    let blockDrive: boolean = false;
    let victoryHandler: BooleanStateHandler = new BooleanStateHandler;

    let servoPositions: { [key: number]: number} = 
    {
        [AllServos.S1]: 90,
        [AllServos.S2]: 90,
        [AllServos.P0]: 90,
        [AllServos.P1]: 90,
        [AllServos.P2]: 90,
    }

    /**
     * Background task that enforces teacher overrides.
     * 
     * Runs continuously in a parallel fiber (100ms intervals).
     * When teacher blocks are active:
     * - blockDrive: forces both motors to 0 power
     * - blockSound: sets volume to 0
     * 
     * This ensures students cannot bypass teacher controls.
     */
    function backGroundTask(): void {
        while(true)
        {
            if (blockDrive) {
                setMotorRawPower(Motor.Left, 0);
                setMotorRawPower(Motor.Right, 0);
            }
            if (blockSound)
            {
                music.setVolume(0);
            }
            pause(100);
        }
    }

    /**
     * Process incoming controller radio messages.
     * 
     * Expected buffer format: [0x43, stickX, stickY, buttonFlags]
     * - Byte 0: Message ID (0x43 = 'C' for Controller)
     * - Byte 1: Joystick X as signed int8 (-127 to 127)
     * - Byte 2: Joystick Y as signed int8 (-127 to 127)
     * - Byte 3: Button state flags (bit 0 = A, bit 1 = B, ..., bit 6 = Logo)
     * 
     * Updates global stickX, stickY, and triggers button state handlers.
     * 
     * @param buffer 4-byte radio buffer from controller
     */
    function handleControllerUpdate(buffer: Buffer): void {
        if (buffer.length != 4) return;

        //extract the stick position from the Buffer
        stickX = buffer.getNumber(NumberFormat.Int8BE, 1) / -127;
        stickY = buffer.getNumber(NumberFormat.Int8BE, 2) / 127;

        //extract the button state from the buffer
        let buttonFlags: number = buffer.getUint8(3);
        for (let button = 0; button < 8; button++) {
            let newState: boolean = (buttonFlags & (1 << button)) != 0;
            buttonHandlers[button].setState(newState);
        }
    }

    /**
     * Process incoming teacher radio messages.
     * 
     * Expected buffer format: [0x54, flags]
     * - Byte 0: Message ID (0x54 = 'T' for Teacher)
     * - Byte 1: Control flags
     *   - Bit 0: blockSound (mute robot)
     *   - Bit 1: blockDrive (disable motors)
     *   - Bit 7: victory (trigger celebration)
     * 
     * Updates global block flags and triggers victory handler.
     * Preserves volume setting when sound is unblocked.
     * 
     * @param buffer 2-byte radio buffer from teacher
     */
    function handleTeacherUpdate(buffer: Buffer): void {
        if (buffer.length != 2) return;
        let flags = buffer.getUint8(1);

        let soundFlag: boolean = (flags & 0x01) != 0;
        let driveFlag: boolean = (flags & 0x02) != 0;
        let victoryFlag: boolean = (flags & 0x80) != 0;

        if (soundFlag && !blockSound) {
            restoreVolume = music.volume();
        }
        else if (!soundFlag && blockSound) {
            music.setVolume(restoreVolume);
        }

        victoryHandler.setState(victoryFlag);

        blockSound = soundFlag;
        blockDrive = driveFlag;
    }
}
