battle_bot.onVictory(function () {
    for (let index = 0; index < 360; index++) {
        strip.showRainbow(start_color, (start_color + 288) % 360)
        start_color = (start_color + 1) % 360
        basic.pause(10)
    }
    strip.clear()
    strip.show()
})
battle_bot.onButtonPress(battle_bot.Button.A, battle_bot.ButtonState.pressed, function () {
    battle_bot.testVictory()
})
let start_color = 0
let strip: neopixel.Strip = null
battle_bot.initBattleBot(0)
strip = battle_bot.initLeds()
basic.forever(function () {
    battle_bot.setMotorSpeed(battle_bot.Motor.Left, battle_bot.calculateMotorSpeed(battle_bot.Motor.Left, battle_bot._getStickX(), battle_bot._getStickY()))
    battle_bot.setMotorSpeed(battle_bot.Motor.Right, battle_bot.calculateMotorSpeed(battle_bot.Motor.Right, battle_bot._getStickX(), battle_bot._getStickY()))
})
