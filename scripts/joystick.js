// Derived from https://github.com/WHOIGit/ros-web-gamepad

function initJoystick() {

    let gamepad_idx = -1;

    window.addEventListener("gamepadconnected", function(e) {
        if (gamepad_idx !== -1) return;
        gamepad_idx = e.gamepad.index;

        console.log(`Gamepad connected: ${e.gamepad.id}`);
    });

    window.addEventListener("gamepaddisconnected", function(e) {
        if (e.gamepad.index === gamepad_idx) {
            gamepad_idx = -1;  
        }
        console.log(`Gamepad disconnected: ${e.gamepad.id}`);
    });

    let joyTopic = new ROSLIB.Topic({
        ros: ros,
        name: "joy",
        messageType: "sensor_msgs/Joy",
    });

    function publishGamepadState() {
        if (gamepad_idx === -1) return;

        const gamepad = navigator.getGamepads()[gamepad_idx];

        let message = new ROSLIB.Message({
            axes: suppressAxisDrift(remapAxes(gamepad.axes)),
            buttons: remapButtons(gamepad.buttons)
        });
        joyTopic.publish(message);
    }

    function remapAxes(axes) {
        return axes.map((x) => -x);
    }

    function remapButtons(buttons) {
        const pressed = buttons.map((x) => { return x.pressed ? 1 : 0; });
        let newButtons = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        newButtons[0] = pressed[3];
        newButtons[1] = pressed[0];
        newButtons[2] = pressed[1];
        newButtons[3] = pressed[2];
        newButtons[4] = pressed[12];
        newButtons[6] = pressed[13];
        newButtons[5] = pressed[14];
        newButtons[7] = pressed[15];
        newButtons[8] = pressed[8];
        newButtons[9] = pressed[9];
        return newButtons;
    }

    function suppressAxisDrift(axes) {
        return axes.map(item => Math.abs(item) < 0.1 ? 0: item);
    }

    setInterval(publishGamepadState, 100 /* 10 Hz */);
}