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
            axes: suppressAxisDrift(gamepad.axes),
            buttons: gamepad.buttons.map((x) => { return x.pressed ? 1 : 0; }),
        });
        joyTopic.publish(message);
    }

    function suppressAxisDrift(axes) {
        return axes.map(item => Math.abs(item) < 0.3 ? 0: item);
    }

    setInterval(publishGamepadState, 100 /* 10 Hz */);
}