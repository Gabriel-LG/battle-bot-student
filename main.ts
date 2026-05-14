battle_bot.onVictory(function () {
	
})
let rgb_start = 0
battle_bot.initBattleBot(5)
let strip = battle_bot.initLeds()
battle_bot.frontLed(battle_bot.FrontLed.Left, false)
basic.forever(function () {
    battle_bot.setMotorSpeed(battle_bot.Motor.Left, battle_bot.calculateMotorSpeed(battle_bot.Motor.Left, battle_bot._getStickX(), battle_bot._getStickY()))
    battle_bot.setMotorSpeed(battle_bot.Motor.Right, battle_bot.calculateMotorSpeed(battle_bot.Motor.Right, battle_bot._getStickX(), battle_bot._getStickY()))
})
basic.forever(function () {
    strip.showRainbow(rgb_start, (rgb_start + 288) % 360)
    rgb_start = (rgb_start + 1) % 360
})
