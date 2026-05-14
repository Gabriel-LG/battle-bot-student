battle_bot.initBattleBot(5)
basic.forever(function () {
    battle_bot.setMotorSpeed(battle_bot.Motor.Left, battle_bot.calculateMotorSpeed(battle_bot._getStickX(), battle_bot._getStickY(), battle_bot.Motor.Left))
    battle_bot.setMotorSpeed(battle_bot.Motor.Right, battle_bot.calculateMotorSpeed(battle_bot._getStickX(), battle_bot._getStickY(), battle_bot.Motor.Right))
})
