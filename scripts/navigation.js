"use strict";

// function initMap() {

//     const MODE = {
//         NAVIGATION: 0,
//         LOCALIZATION: 1
//     }

//     const mapImg = document.getElementById('map');
//     const coordOutput = document.getElementById('coord-output');
//     const localizeBtn = document.getElementById('localizeBtn');
//     const navBtn = document.getElementById('navBtn');

//     let mode = null;
//     let localizeCoord = null;
//     let navCoord = null;
//     let localizeMarker = null;
//     let navMarker = null;

//     localizeBtn.onclick = function() {
//         if (mode !== null && mode == MODE.LOCALIZATION) {
//             mode = null;
//             localizeBtn.classList.remove('btn-active');
//         } else {
//             mode = MODE.LOCALIZATION;
//             resetButtons();
//             localizeBtn.classList.add('btn-active');
//         }
//     }

//     navBtn.onclick = function() {
//         if (mode !== null && mode == MODE.NAVIGATION) {
//             mode = null;
//             navBtn.classList.remove('btn-active');
//         } else {
//             mode = MODE.NAVIGATION;
//             resetButtons();
//             navBtn.classList.add('btn-active');
//         }
//     }

//     map.onclick = function(event) {
//         if (mode == null) return;
        
//         const rect = map.getBoundingClientRect();
        
//         const x = event.clientX - rect.left;
//         const y = event.clientY - rect.top;

//         const xPercent = (x / rect.width) * 100;
//         const yPercent = 100 - (y / rect.height) * 100; // map coordinate in ROS has its origin in the bottom left corner

//         coordOutput.textContent = `X: ${xPercent.toFixed(2)}%, Y: ${yPercent.toFixed(2)}%`;


//         if (mode == MODE.LOCALIZATION) {
//             if (localizeMarker) {
//                 localizeMarker.remove();
//             }
//             localizeMarker = document.createElement("div");
//             localizeMarker.classList.add("marker", "red-marker");
//             localizeMarker.style.left = `calc(${xPercent}% - 5px)`;
//             localizeMarker.style.bottom = `calc(${yPercent}% - 5px)`;
//             document.getElementById("image-container").appendChild(localizeMarker);
//             localizeCoord = { xPercent, yPercent };
//             console.log(localizeCoord);
//         } else {
//             if (navMarker) {
//                 navMarker.remove();
//             }
//             navMarker = document.createElement("div");
//             navMarker.classList.add("marker", "blue-marker");
//             navMarker.style.left = `calc(${xPercent}% - 5px)`;
//             navMarker.style.bottom = `calc(${yPercent}% - 5px)`;
//             document.getElementById("image-container").appendChild(navMarker);
//             navCoord = { xPercent, yPercent };
//             console.log(navCoord);
//         }
//     }

//     function resetButtons() {
//         localizeBtn.classList.remove("btn-active");
//         navBtn.classList.remove("btn-active");
//     }
// }

const ROBOT_DIAMETER = 0.65;

function initMap() {

    const navContainer = document.getElementById('nav');

    // Clean up DOM element from previous render (e.g., last onresize event)
    navContainer.innerHTML = '';

    // Connect to ROS.
    var ros = new ROSLIB.Ros({
      url : 'ws://localhost:9090'
    });

    var listener = new ROSLIB.Topic({
      ros : ros,
      name : '/map',
      messageType : 'nav_msgs/OccupancyGrid'
    });

    listener.subscribe(function(message) {
      
      const scaleFactor = navContainer.offsetWidth / message.info.width;

      // Create the main viewer.
      var viewer = new ROS2D.Viewer({
        divID : 'nav',
        width : navContainer.offsetWidth,
        height : message.info.height * scaleFactor
      });

      // Setup the nav client.
      var nav = NAV2D.OccupancyGridClientNav({
        ros : ros,
        rootObject : viewer.scene,
        viewer : viewer,
        serverName : '/pr2_move_base',
        withOrientation: true,
        arrow_size: ROBOT_DIAMETER / message.info.resolution * scaleFactor
      });
      

      listener.unsubscribe();
    });
}