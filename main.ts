battle_bot.onLineSensor(battle_bot.LineSensor.Left, battle_bot.LineSensorEvents.Lost, function () {
    battle_bot.frontLed(battle_bot.FrontLed.Left, false)
})
battle_bot.onButtonPress(battle_bot.Button.F, battle_bot.ButtonState.released, function () {
    maqueen.servoRun(maqueen.Servos.S1, 180)
})
battle_bot.onLineSensor(battle_bot.LineSensor.Right, battle_bot.LineSensorEvents.Found, function () {
    battle_bot.frontLed(battle_bot.FrontLed.Right, true)
})
battle_bot.onLineSensor(battle_bot.LineSensor.Left, battle_bot.LineSensorEvents.Found, function () {
    battle_bot.frontLed(battle_bot.FrontLed.Left, true)
})
battle_bot.onButtonPress(battle_bot.Button.C, battle_bot.ButtonState.released, function () {
    maqueen.servoRun(maqueen.Servos.S2, 0)
})
battle_bot.onButtonPress(battle_bot.Button.C, battle_bot.ButtonState.pressed, function () {
    maqueen.servoRun(maqueen.Servos.S2, 180)
})
battle_bot.onButtonPress(battle_bot.Button.F, battle_bot.ButtonState.pressed, function () {
    maqueen.servoRun(maqueen.Servos.S1, 0)
})
battle_bot.onLineSensor(battle_bot.LineSensor.Right, battle_bot.LineSensorEvents.Lost, function () {
    battle_bot.frontLed(battle_bot.FrontLed.Right, false)
})
battle_bot.initBattleBot(0)
basic.forever(function () {
    battle_bot.setMotorPower(battle_bot.Motor.Left, battle_bot.speedToPower(battle_bot.calculateMotorSpeed(battle_bot.Motor.Left, battle_bot.getStick(battle_bot.StickAxis.X), battle_bot.getStick(battle_bot.StickAxis.Y))))
    battle_bot.setMotorPower(battle_bot.Motor.Right, battle_bot.speedToPower(battle_bot.calculateMotorSpeed(battle_bot.Motor.Right, battle_bot.getStick(battle_bot.StickAxis.X), battle_bot.getStick(battle_bot.StickAxis.Y))))
})
