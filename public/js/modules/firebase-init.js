import { initializeApp } from "firebase/app";

const firebaseConfig = {
    apiKey: "AIzaSyDWeFOzmTk06uYUItFCOm52WuiNq1UNMxw",
    authDomain: "freqminer-fd468.firebaseapp.com",
    projectId: "freqminer-fd468",
    storageBucket: "freqminer-fd468.appspot.com",
    messagingSenderId: "555264435722",
    appId: "1:555264435722:web:b827920d6495f8dc7621f3"
};

// Initialize Firebase
let initialize = function () {
    initializeApp(firebaseConfig);
};

export { initialize }