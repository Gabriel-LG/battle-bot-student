
/**
* Use this file to define custom functions and blocks.
* Read more at https://makecode.microbit.org/blocks/custom
*/


/**
 * Custom blocks
 */
//% weight=100 color=#EE7202 icon="\uf3ed"
//% block="BattleBot"
namespace battle_bot {
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
        left = 0,
        //% blockid="Right motor" block="right"
        right = 2,
    }

    class ButtonHandler {
        constructor() { }

        pressed: boolean = false;
        pressHandler: () => void = undefined;
        releaseHandler: () => void = undefined;

        private handlerRunning: boolean = false;

        handle(pressed: boolean): void {
            //no change, nothing to do
            if (pressed == this.pressed) return;
            this.pressed = pressed;
            if (this.handlerRunning) return; //already running a handler

            // button pressed
            if (pressed && this.pressHandler != undefined) {
                this.handlerRunning = true;
                control.runInParallel(() => {
                    //run the press handler
                    this.pressHandler();
                    //if the button is released by now, run the released handler
                    if (!this.pressed && this.releaseHandler != undefined) this.releaseHandler();
                    this.handlerRunning = false;
                });
            }

            //button released
            if (!pressed && this.releaseHandler != undefined) {
                this.handlerRunning = true;
                control.runInParallel(() => {
                    //run the release handler
                    this.releaseHandler();
                    //if the button is pressed again by now, run the released handler
                    if (!this.pressed && this.releaseHandler != undefined) this.releaseHandler();
                    this.handlerRunning = false;
                });
            }
        }
    }


    let started: boolean = false;

    let buttonHandlers: { [key: number]: ButtonHandler } = {
        [0]: new ButtonHandler,
        [1]: new ButtonHandler,
        [2]: new ButtonHandler,
        [3]: new ButtonHandler,
        [4]: new ButtonHandler,
        [5]: new ButtonHandler,
        [6]: new ButtonHandler,
        [7]: new ButtonHandler,
    };
    let stickX: number = 0;
    let stickY: number = 0;

    let restoreVolume: number = 0;
    let blockSound: boolean = false;
    let blockDrive: boolean = false;
    let victoryHandlerActive: boolean = false;
    let victoryHandler: () => void = undefined;

    //% block
    export function initBattleBot(id: number): void {
        radio.setGroup(0);
        radio.setFrequencyBand(id * 5);
        control.runInParallel(backGroundTask);
        started = true;
    }

    function backGroundTask(): void {
        if (blockDrive) {
            setMotorPower(Motor.left, 0);
            setMotorPower(Motor.right, 0);
        }
        if (blockSound)
        {
            music.setVolume(0);
        }
    }


    //% block
    export function onButtonPress(button: Button, state: ButtonState, handler: () => void): void {
        if (state == ButtonState.pressed) buttonHandlers[button].pressHandler = handler;
        if (state == ButtonState.released) buttonHandlers[button].releaseHandler = handler;
    }

    //% block
    export function testVictory() : void
    {
        if (victoryHandler != undefined) {
            victoryHandlerActive = true;
            control.runInParallel(() => {
                victoryHandler();
                victoryHandlerActive = false;
            });
        }
    }


    //% block
    export function onVictory(handler: () => void): void
    {
        victoryHandler = handler;
    }

    //% block
    export function getStick(axis: StickAxis): number
    {
        if (axis == StickAxis.X) return stickX;
        if (axis == StickAxis.Y) return stickY;
        if (axis == StickAxis.Magnitude) return Math.clamp(0, 1, Math.sqrt(stickX * stickX + stickY * stickY));
        if (axis == StickAxis.Angle) {
            return Math.atan2(stickX, Math.abs(stickY)) / (Math.PI / 2);
        }
        return undefined;
    }

    //% block
    export function getButtonState(button: Button): boolean
    {
        return buttonHandlers[button].pressed;
    }

    //% block
    export function setMotorPower(motor: Motor, speed: number)
    {
        if (blockDrive) speed = 0;
        let buf = pins.createBuffer(3);
        buf[0] = <uint8>motor;
        buf[1] = speed > 0 ? 0 : 1;
        buf[2] = <uint8>Math.clamp(0, 255, Math.abs(speed) * 255);
        pins.i2cWriteBuffer(0x10, buf);
    }

    //% block
    export function speedToPower(speed: number): number
    {
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
    export function calculateMotorSpeed(motor: Motor, stickX: number, stickY: number) : number
    {
        let magnitude = Math.clamp(0, 1, Math.sqrt(stickX * stickX + stickY * stickY));
        let angle = Math.atan2(stickX, Math.abs(stickY)) / (Math.PI / 2);

        let leftSpeed: number = 0;
        let rightSpeed: number = 0;

        //relinearize the angle
        if(Math.abs(angle)< 0.75)
        {
            angle = angle / 0.75 / 2;
        } 
        else if(angle > 0)
        {
            angle = 1 - (1 - angle) / 0.25 / 2;
        }
        else //if(angle < 0)
        {
            angle = -1 + (1 + angle) / 0.25 / 2;
        }

        if(stickY >= 0) //forward
        {
            leftSpeed = magnitude + magnitude * angle * 2;
            rightSpeed = magnitude - magnitude * angle * 2;
        }
        else //reverse
        {
            leftSpeed = -magnitude + magnitude * angle * 2;
            rightSpeed = -magnitude - magnitude * angle * 2;
        }

        if(motor == Motor.left) return leftSpeed;
        else return rightSpeed;
    }

    radio.onReceivedBuffer((buffer: Buffer) =>
        {
            let id = buffer.getUint8(0);
            if (id == 0x43 /*'C'*/) handleControllerUpdate(buffer);
            if (id == 0x54 /*'T'*/) handleTeacherUpdate(buffer);

        });

    function handleControllerUpdate(buffer: Buffer): void {
        if (buffer.length != 4) return;

        //extract the stick position from the Buffer
        stickX = buffer.getNumber(NumberFormat.Int8BE, 1) / -127;
        stickY = buffer.getNumber(NumberFormat.Int8BE, 2) / 127;

        //extract the button state from the buffer
        let buttonFlags: number = buffer.getUint8(3);
        for (let button = 0; button < 8; button++) {
            let newState: boolean = (buttonFlags & (1 << button)) != 0;
            buttonHandlers[button].handle(newState);
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

        if (victoryFlag && !victoryHandlerActive) {
            testVictory();
        }

        blockSound = soundFlag;
        blockDrive = driveFlag;
    }
}
