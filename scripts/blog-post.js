import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  doc,
  getDoc,
  getFirestore,
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

const titleEl = document.querySelector("[data-post-title]");
const metaEl = document.querySelector("[data-post-meta]");
const bodyEl = document.querySelector("[data-post-body]");
const statusEl = document.querySelector("[data-post-status]");

const formatDate = (value) => {
  if (!value) return "Draft";
  const date = value.toDate ? value.toDate() : value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const setStatus = (message) => {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.hidden = !message;
};

const sanitizeHtml = (html) => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  wrapper.querySelectorAll("script, style, iframe").forEach((node) => node.remove());
  wrapper.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      if (attr.name.startsWith("on") || attr.name === "style") {
        node.removeAttribute(attr.name);
      }
    });
  });
  return wrapper.innerHTML;
};

const renderBody = (body) => {
  if (!bodyEl) return;
  bodyEl.replaceChildren();
  const text = (body || "").trim();
  if (!text) {
    setStatus("This post has no content yet.");
    return;
  }
  setStatus("");
  const paragraphs = text.split(/\n{2,}/);
  paragraphs.forEach((paragraph) => {
    const p = document.createElement("p");
    const lines = paragraph.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) {
        p.appendChild(document.createElement("br"));
      }
      p.appendChild(document.createTextNode(line));
    });
    bodyEl.appendChild(p);
  });
};

const loadPost = async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    setStatus("Missing post id.");
    return;
  }

  try {
    const snapshot = await getDoc(doc(db, "blogPosts", id));
    if (!snapshot.exists()) {
      setStatus("Post not found.");
      return;
    }
    const data = snapshot.data();
    const title = data.title ?? "Untitled";
    const category = data.category ?? "";
    const date = formatDate(data.createdAt);

    if (titleEl) titleEl.textContent = title;
    if (metaEl) {
      if (category) {
        metaEl.textContent = `${category} - ${date}`;
      } else {
        metaEl.textContent = date;
      }
    }
    if (data.bodyHtml) {
      if (bodyEl) {
        bodyEl.innerHTML = sanitizeHtml(data.bodyHtml);
        setStatus("");
      }
    } else {
      renderBody(data.body);
    }
  } catch (error) {
    setStatus("Unable to load this post.");
  }
};

loadPost();
