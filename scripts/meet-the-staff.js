import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDGbEpmLm2HxkFvcca6Ae4V2Kfn--d7bRo",
  authDomain: "mpms-website-80b69.firebaseapp.com",
  projectId: "mpms-website-80b69",
  storageBucket: "mpms-website-80b69.firebasestorage.app",
  messagingSenderId: "837288121384",
  appId: "1:837288121384:web:e6d25084ac17d98575d11d",
  measurementId: "G-JH8H58273B",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const grid = document.querySelector("[data-staff-grid]");

const renderStaff = (docs) => {
  if (!grid) return;

  grid.replaceChildren();

  if (!docs.length) {
    const empty = document.createElement("p");
    empty.className = "staff-empty";
    empty.textContent = "Staff profiles are coming soon.";
    grid.appendChild(empty);
    return;
  }

  docs.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const name = data.name ?? "Staff Member";
    const title = data.title ?? "";
    const credentials = data.credentials ?? "";
    const photoUrl = data.photoUrl ?? "";

    const card = document.createElement("article");
    card.className = "staff-card";

    const photoWrap = document.createElement("div");
    photoWrap.className = "staff-photo";
    if (photoUrl) {
      const img = document.createElement("img");
      img.src = photoUrl;
      img.alt = name;
      img.loading = "lazy";
      photoWrap.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "staff-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.textContent = "No photo";
      photoWrap.appendChild(placeholder);
    }

    const info = document.createElement("div");
    info.className = "staff-info";
    const nameEl = document.createElement("h3");
    nameEl.textContent = name;
    info.appendChild(nameEl);

    if (title) {
      const titleEl = document.createElement("p");
      titleEl.className = "staff-title";
      titleEl.textContent = title;
      info.appendChild(titleEl);
    }

    if (credentials) {
      const credEl = document.createElement("p");
      credEl.className = "staff-credentials";
      credEl.textContent = credentials;
      info.appendChild(credEl);
    }

    card.appendChild(photoWrap);
    card.appendChild(info);
    grid.appendChild(card);
  });
};

if (grid) {
  const staffQuery = query(collection(db, "staff"), orderBy("order", "asc"));
  onSnapshot(
    staffQuery,
    (snapshot) => {
      renderStaff(snapshot.docs);
    },
    () => {
      grid.replaceChildren();
      const error = document.createElement("p");
      error.className = "staff-empty";
      error.textContent = "Unable to load staff right now.";
      grid.appendChild(error);
    }
  );
}
