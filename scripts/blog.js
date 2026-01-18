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

const grid = document.querySelector("[data-blog-grid]");

const formatDate = (value) => {
  if (!value) return "Draft";
  const date = value.toDate ? value.toDate() : value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const makeExcerpt = (excerpt, body, bodyHtml) => {
  const htmlText = bodyHtml
    ? new DOMParser().parseFromString(bodyHtml, "text/html").body.textContent
    : "";
  const text = (excerpt || body || htmlText || "").trim();
  if (!text) return "";
  if (text.length <= 180) return text;
  return `${text.slice(0, 177)}...`;
};

const renderPosts = (docs) => {
  if (!grid) return;
  grid.replaceChildren();
  if (!docs.length) {
    const empty = document.createElement("p");
    empty.className = "blog-empty";
    empty.textContent = "No blog posts yet.";
    grid.appendChild(empty);
    return;
  }

  docs.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const title = data.title ?? "Untitled";
    const category = data.category ?? "";
    const date = formatDate(data.createdAt);
    const excerpt = makeExcerpt(data.excerpt, data.body, data.bodyHtml);
    const coverUrl = data.coverImageUrl ?? "";

    const card = document.createElement("article");
    card.className = "card blog-card";

    if (coverUrl) {
      const cover = document.createElement("img");
      cover.className = "blog-cover";
      cover.src = coverUrl;
      cover.alt = title;
      cover.loading = "lazy";
      card.appendChild(cover);
    } else {
      const cover = document.createElement("div");
      cover.className = "blog-cover blog-cover-empty";
      cover.setAttribute("aria-hidden", "true");
      card.appendChild(cover);
    }

    const body = document.createElement("div");
    body.className = "blog-card-body";

    const titleEl = document.createElement("h2");
    titleEl.textContent = title;
    body.appendChild(titleEl);

    const meta = document.createElement("p");
    meta.className = "blog-meta";
    if (category) {
      const strong = document.createElement("strong");
      strong.textContent = category;
      meta.appendChild(strong);
      meta.append(" - ");
    }
    meta.append(date);
    body.appendChild(meta);

    if (excerpt) {
      const excerptEl = document.createElement("p");
      excerptEl.textContent = excerpt;
      body.appendChild(excerptEl);
    }

    const link = document.createElement("a");
    link.href = `blog-post.html?id=${docSnapshot.id}`;
    link.textContent = "Read more";
    body.appendChild(link);

    card.appendChild(body);

    grid.appendChild(card);
  });
};

if (grid) {
  const blogQuery = query(collection(db, "blogPosts"), orderBy("createdAt", "desc"));
  onSnapshot(
    blogQuery,
    (snapshot) => {
      renderPosts(snapshot.docs);
    },
    () => {
      grid.replaceChildren();
      const error = document.createElement("p");
      error.className = "blog-empty";
      error.textContent = "Unable to load blog posts right now.";
      grid.appendChild(error);
    }
  );
}
