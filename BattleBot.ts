
/**
* Use this file to define custom functions and blocks.
* Read more at https://makecode.microbit.org/blocks/custom
*/


/**
 * Custom blocks
 */
//% weight=100 color=#EE7202 icon="\uf3ed"
//% block="BattleBot"
//% groups=["hoi", "Driving", "Controller", "Servos", "Sensors", "Lights", "Victory"]
namespace battle_bot {

    //% block
    export function initBattleBot(id: number): void {
        radio.setGroup(0);
        radio.setFrequencyBand(id * 5);

        radio.onReceivedBuffer((buffer: Buffer) => {
            let id = buffer.getUint8(0);
            if (id == 0x43 /*'C'*/) handleControllerUpdate(buffer);
            if (id == 0x54 /*'T'*/) handleTeacherUpdate(buffer);

        });

        pins.P13.onEvent(PinEvent.Rise, () => { lineSensorLeftHandler.setState(true); });
        pins.P13.onEvent(PinEvent.Fall, () => { lineSensorLeftHandler.setState(false); });
        pins.P14.onEvent(PinEvent.Rise, () => { lineSensorRightHandler.setState(true); });
        pins.P14.onEvent(PinEvent.Fall, () => { lineSensorRightHandler.setState(false); });

        control.runInParallel(backGroundTask);
        started = true;
    }


    //% block
    //% group="Driving"
    export function setMotorPower(motor: Motor, speed: number) {
        if (motor != Motor.Left && motor != Motor.Right) return; //sanity check
        
        if (blockDrive) speed = 0;

        let buf = pins.createBuffer(3);
        buf[0] = <uint8>motor;
        buf[1] = speed > 0 ? 0 : 1;
        buf[2] = <uint8>Math.clamp(0, 255, Math.abs(speed) * 255);
        
        for (let retries = 0; retries < 3; retries++)
        {
            if(pins.i2cWriteBuffer(0x10, buf) == 0) break;
        }
    }

    //% block
    //% group="Driving"
    export function speedToPower(speed: number): number {
        const s = Math.clamp(0, 1, Math.abs(speed));

        // Algebraically solved inverse of the saturation curve:
        // s = ( 1.04 * Math.power(power, 1.85) ) / ( 0.04 + Math.power(power, 1.85) )
        let power = Math.pow(0.04, 1 / 1.85) * Math.pow(s / (1.04 - s), 1 / 1.85);

        // Standard safety and deadzone
        if (power > 1) power = 1;
        if (power < 0.1) return 0;

        return speed < 0 ? -power : power;
    }

    //% block
    //% group="Driving"
    export function calculateMotorSpeed(motor: Motor, stickX: number, stickY: number): number {
        let magnitude = Math.clamp(0, 1, Math.sqrt(stickX * stickX + stickY * stickY));
        let angle = Math.atan2(stickX, Math.abs(stickY)) / (Math.PI / 2);

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

        if (stickY >= 0) //forward
        {
            leftSpeed = magnitude + magnitude * angle * 2;
            rightSpeed = magnitude - magnitude * angle * 2;
        }
        else //reverse
        {
            leftSpeed = -magnitude + magnitude * angle * 2;
            rightSpeed = -magnitude - magnitude * angle * 2;
        }

        if (motor == Motor.Left) return leftSpeed;
        else return rightSpeed;
    }

    //% block
    //% group="Controller"
    export function onButtonPress(button: Button, state: ButtonState, handler: () => void): void {
        if (state == ButtonState.pressed) buttonHandlers[button].setHandler = handler;
        if (state == ButtonState.released) buttonHandlers[button].clearHandler = handler;
    }

    //% block
    //% group="Controller"
    export function getStick(axis: StickAxis): number {
        if (axis == StickAxis.X) return stickX;
        if (axis == StickAxis.Y) return stickY;
        if (axis == StickAxis.Magnitude) return Math.clamp(0, 1, Math.sqrt(stickX * stickX + stickY * stickY));
        if (axis == StickAxis.Angle) {
            return Math.atan2(stickX, Math.abs(stickY)) / (Math.PI / 2);
        }
        return undefined;
    }

    //% block
    //% group="Controller"
    export function getButtonState(button: Button): boolean {
        return buttonHandlers[button].getState();
    }

    /* **************** copied from DFRobot Maqueen extension ****************** */
    let state1 = 0;
    /**
     * Read ultrasonic sensor.
     */

    // % blockId=ultrasonic_sensor 
    //% block="read ultrasonic sensor in cm"
    //% group="Sensors"
    export function Ultrasonic(): number {
        let data;
        let i = 0;
        data = readUlt(PingUnit.Centimeters);
        if (state1 == 1 && data != 0) {
            state1 = 0;
        }
        if (data != 0) {
        } else {
            if (state1 == 0) {
                do {
                    data = readUlt(PingUnit.Centimeters);
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
    function readUlt(unit: number): number {
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
        switch (unit) {
            case PingUnit.Centimeters: return Math.round(x);
            default: return Math.idiv(d, 2.54);
        }
    }

    /* **************** end copied from DFRobot Maqueen extension ****************** */

    //% block
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

    //% block
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

    //% block
    //% group=Victory
    export function testVictory(): void {
        victoryHandler.setState(false);
        victoryHandler.setState(true);
    }


    //% block
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




    /**
     * The boolean state handler will call the set handler when the state transitions to true,
     * it will call the clear handler when the state transisitions to false.
     * The handlers run in a parallel fiber, two handlers are never active at the same time.
     * So before the clear handler is called, the set handler must be finished and vise versa.
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

    let buttonHandlers: { [key: number]: BooleanStateHandler } = {
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

    let lineSensorLeftHandler: BooleanStateHandler;
    let lineSensorRightHandler: BooleanStateHandler;

    let restoreVolume: number = 0;
    let blockSound: boolean = false;
    let blockDrive: boolean = false;
    let victoryHandler: BooleanStateHandler;

    function backGroundTask(): void {
        while(true)
        {
            if (blockDrive) {
                setMotorPower(Motor.Left, 0);
                setMotorPower(Motor.Right, 0);
            }
            if (blockSound)
            {
                music.setVolume(0);
            }
            pause(100);
        }
    }

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
