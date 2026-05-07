battle_bot.onButtonPress(battle_bot.Button.F, battle_bot.ButtonState.released, function () {
    maqueen.servoRun(maqueen.Servos.S1, 180)
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
battle_bot.initBattleBot(0)
basic.forever(function () {
    basic.clearScreen()
    led.plot(Math.round(battle_bot.getStick(battle_bot.StickAxis.X) * -2 + 2), 0)
    if (battle_bot.getButtonState(battle_bot.Button.E)) {
        battle_bot.setMotorPower(battle_bot.Motor.left, battle_bot.speedToPower(battle_bot.getStick(battle_bot.StickAxis.Y) + battle_bot.getStick(battle_bot.StickAxis.Angle) * battle_bot.getStick(battle_bot.StickAxis.Magnitude)))
        battle_bot.setMotorPower(battle_bot.Motor.right, battle_bot.speedToPower(battle_bot.getStick(battle_bot.StickAxis.Y) - battle_bot.getStick(battle_bot.StickAxis.Angle) * battle_bot.getStick(battle_bot.StickAxis.Magnitude)))
    } else if (battle_bot.getStick(battle_bot.StickAxis.Y) >= 0) {
        battle_bot.setMotorPower(battle_bot.Motor.left, battle_bot.speedToPower(battle_bot.getStick(battle_bot.StickAxis.Magnitude) + battle_bot.getStick(battle_bot.StickAxis.Angle) * battle_bot.getStick(battle_bot.StickAxis.Magnitude)))
        battle_bot.setMotorPower(battle_bot.Motor.right, battle_bot.speedToPower(battle_bot.getStick(battle_bot.StickAxis.Magnitude) - battle_bot.getStick(battle_bot.StickAxis.Angle) * battle_bot.getStick(battle_bot.StickAxis.Magnitude)))
    } else {
        battle_bot.setMotorPower(battle_bot.Motor.left, battle_bot.speedToPower(-1 * battle_bot.getStick(battle_bot.StickAxis.Magnitude) + battle_bot.getStick(battle_bot.StickAxis.Angle) * battle_bot.getStick(battle_bot.StickAxis.Magnitude)))
        battle_bot.setMotorPower(battle_bot.Motor.right, battle_bot.speedToPower(-1 * battle_bot.getStick(battle_bot.StickAxis.Magnitude) - battle_bot.getStick(battle_bot.StickAxis.Angle) * battle_bot.getStick(battle_bot.StickAxis.Magnitude)))
    }
})
