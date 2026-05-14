battlebot.onButtonPress(battlebot.Button.A, battlebot.ButtonState.pressed, function () {
    battlebot.testVictory()
})
battlebot.onVictory(function () {
    for (let index = 0; index < 360; index++) {
        strip.showRainbow(start_color, (start_color + 288) % 360)
        start_color = (start_color + 1) % 360
        basic.pause(10)
    }
    strip.clear()
    strip.show()
})
let start_color = 0
let strip: neopixel.Strip = null
battlebot.initBattleBot(0)
strip = battlebot.initLeds()
basic.forever(function () {
    battlebot.setMotorSpeed(battlebot.Motor.Left, battlebot.calculateMotorSpeed(battlebot.Motor.Left, battlebot._getStickX(), battlebot._getStickY()))
    battlebot.setMotorSpeed(battlebot.Motor.Right, battlebot.calculateMotorSpeed(battlebot.Motor.Right, battlebot._getStickX(), battlebot._getStickY()))
})
