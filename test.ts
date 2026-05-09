battle_bot.onButtonPress(battle_bot.Button.B, battle_bot.ButtonState.pressed, function () {
    battle_bot.moveServo(battle_bot.AllServos.P2, 0)
})
battle_bot.onButtonPress(battle_bot.Button.A, battle_bot.ButtonState.pressed, function () {
    battle_bot.disableServo(battle_bot.MicrobitServos.P0)
    battle_bot.disableServo(battle_bot.MicrobitServos.P1)
    battle_bot.disableServo(battle_bot.MicrobitServos.P2)
})
battle_bot.onButtonPress(battle_bot.Button.F, battle_bot.ButtonState.released, function () {
    battle_bot.moveServo(battle_bot.AllServos.S2, 180)
})
battle_bot.onLineSensor(battle_bot.LineSensor.Right, battle_bot.LineSensorEvents.Found, function () {
    battle_bot.frontLed(battle_bot.FrontLed.Right, true)
})
battle_bot.onButtonPress(battle_bot.Button.D, battle_bot.ButtonState.released, function () {
    battle_bot.moveServo(battle_bot.AllServos.P1, battle_bot.servoPosition(battle_bot.AllServos.P1) + 1)
})
battle_bot.onButtonPress(battle_bot.Button.E, battle_bot.ButtonState.pressed, function () {
    battle_bot.moveServo(battle_bot.AllServos.P1, battle_bot.servoPosition(battle_bot.AllServos.P1) - 1)
})
battle_bot.onButtonPress(battle_bot.Button.C, battle_bot.ButtonState.released, function () {
    battle_bot.moveServo(battle_bot.AllServos.S1, 0)
})
battle_bot.onButtonPress(battle_bot.Button.D, battle_bot.ButtonState.pressed, function () {
    battle_bot.moveServo(battle_bot.AllServos.P1, battle_bot.servoPosition(battle_bot.AllServos.P1) + 1)
})
battle_bot.onButtonPress(battle_bot.Button.B, battle_bot.ButtonState.released, function () {
    battle_bot.moveServo(battle_bot.AllServos.P2, 180)
})
battle_bot.onButtonPress(battle_bot.Button.C, battle_bot.ButtonState.pressed, function () {
    battle_bot.moveServo(battle_bot.AllServos.S1, 180)
})
battle_bot.onButtonPress(battle_bot.Button.F, battle_bot.ButtonState.pressed, function () {
    battle_bot.moveServo(battle_bot.AllServos.S2, 0)
})
battle_bot.onLineSensor(battle_bot.LineSensor.Right, battle_bot.LineSensorEvents.Lost, function () {
    battle_bot.frontLed(battle_bot.FrontLed.Right, false)
})
battle_bot.onButtonPress(battle_bot.Button.E, battle_bot.ButtonState.released, function () {
    battle_bot.moveServo(battle_bot.AllServos.P1, battle_bot.servoPosition(battle_bot.AllServos.P1) - 1)
})
battle_bot.initBattleBot(0)
let strip = battle_bot.initLeds()
strip.showRainbow(1, 288)
basic.forever(function () {
    battle_bot.setMotorPower(battle_bot.Motor.Left, battle_bot.speedToPower(battle_bot.calculateMotorSpeed(battle_bot.Motor.Left, battle_bot.getStick(battle_bot.StickAxis.X), battle_bot.getStick(battle_bot.StickAxis.Y))))
    battle_bot.setMotorPower(battle_bot.Motor.Right, battle_bot.speedToPower(battle_bot.calculateMotorSpeed(battle_bot.Motor.Right, battle_bot.getStick(battle_bot.StickAxis.X), battle_bot.getStick(battle_bot.StickAxis.Y))))
    battle_bot.frontLed(battle_bot.FrontLed.Left, battle_bot.readLineSensor(battle_bot.LineSensor.Left))
})
