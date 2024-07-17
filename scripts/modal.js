const modalElement = document.getElementById('popup-modal');
const goalText = document.getElementById('goal');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');

const options = {
    placement: 'bottom-center',
    backdrop: 'dynamic',
    backdropClasses: 'hidden',
    closable: true,
    onHide: () => {
        console.log('modal is hidden');
    },
    onShow: () => {
        console.log('modal is shown');
    },
    onToggle: () => {
        console.log('modal has been toggled');
    },
};

const modal = new Modal(modalElement, options);

function showNavPopup(goal) {
	goalText.innerHTML = goal.target.label;
	
	modalConfirmBtn.onclick = () => {
		
		let [x,y,z,qx,qy,qz,qw] = goal.target.coordinate;

		let position = new ROSLIB.Vector3({
			x : x,
			y : y
		});

		let orientation = new ROSLIB.Quaternion({x:0, y:0, z:qz, w:qw});

		let pose = new ROSLIB.Pose({
          position: position,
          orientation: orientation
        });

		navClient.navigator.sendGoal(pose);
	}

	modalCancelBtn.onclick = () => {
		modalConfirmBtn.onclick = null;
		modal.hide();
	}

	modal.show();
}