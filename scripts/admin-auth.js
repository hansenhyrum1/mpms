import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const authSection = document.querySelector("[data-auth-section]");
const adminSection = document.querySelector("[data-admin-section]");
const form = document.querySelector(".auth-form");
const errorText = document.querySelector(".auth-error");
const adminUser = document.querySelector(".admin-user");
const signoutBtn = document.querySelector(".admin-signout");
const staffForm = document.querySelector("[data-staff-form]");
const staffList = document.querySelector("[data-staff-list]");
const staffError = document.querySelector(".staff-error");
const staffSuccess = document.querySelector(".staff-success");
const blogList = document.querySelector("[data-blog-list]");
const blogError = document.querySelector(".blog-error");
const blogSuccess = document.querySelector(".blog-success");
const staffPreview = document.querySelector("[data-staff-preview]");
const staffPreviewImg = staffPreview?.querySelector("img");
const photoInput = staffForm?.querySelector("input[name='photoFile']");
const contactForm = document.querySelector("[data-contact-form]");
const contactInput = contactForm?.querySelector("input[name='contactRecipient']");
const contactError = document.querySelector(".contact-error");
const contactSuccess = document.querySelector(".contact-success");
const cropModal = document.querySelector("[data-crop-modal]");
const cropFrame = document.querySelector("[data-crop-frame]");
const cropImage = document.querySelector("[data-crop-image]");
const cropZoom = document.querySelector("[data-crop-zoom]");
const cropCancel = document.querySelector("[data-crop-cancel]");
const cropConfirm = document.querySelector("[data-crop-confirm]");

const OUTPUT_SIZE = 600;
let cropObjectUrl = "";
let previewUrl = "";
let croppedBlob = null;
let croppedName = "";
let currentStaff = [];
let cropState = {
  file: null,
  frameSize: 0,
  naturalWidth: 0,
  naturalHeight: 0,
  scale: 1,
  minScale: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  startX: 0,
  startY: 0,
  startOffsetX: 0,
  startOffsetY: 0,
  ready: false,
};
let dragPending = false;
let dragActive = false;
let dragItem = null;
let dragPlaceholder = null;
let dragGhost = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

const setVisible = (el, visible) => {
  if (!el) return;
  el.hidden = !visible;
};

const setError = (message) => {
  if (!errorText) return;
  errorText.textContent = message;
  errorText.hidden = !message;
};

const setStaffError = (message) => {
  if (!staffError) return;
  staffError.textContent = message;
  staffError.hidden = !message;
};

const setStaffSuccess = (message) => {
  if (!staffSuccess) return;
  staffSuccess.textContent = message;
  staffSuccess.hidden = !message;
};

const setBlogError = (message) => {
  if (!blogError) return;
  blogError.textContent = message;
  blogError.hidden = !message;
};

const setBlogSuccess = (message) => {
  if (!blogSuccess) return;
  blogSuccess.textContent = message;
  blogSuccess.hidden = !message;
};

const setContactError = (message) => {
  if (!contactError) return;
  contactError.textContent = message;
  contactError.hidden = !message;
};

const setContactSuccess = (message) => {
  if (!contactSuccess) return;
  contactSuccess.textContent = message;
  contactSuccess.hidden = !message;
};

const formatDate = (value) => {
  if (!value) return "Draft";
  const date = value.toDate ? value.toDate() : value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const normalizeText = (value) => value.replace(/\s+/g, " ").trim();

const extractHtmlText = (bodyHtml) => {
  if (!bodyHtml) return "";
  const doc = new DOMParser().parseFromString(bodyHtml, "text/html");
  doc.body
    .querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, br, div")
    .forEach((el) => {
      el.insertAdjacentText("beforebegin", " ");
      el.insertAdjacentText("afterend", " ");
    });
  return doc.body.textContent ?? "";
};

const makeExcerpt = (excerpt) => {
  const rawText = (excerpt || "").trim();
  if (!rawText) return "";
  const text = normalizeText(rawText);
  if (!text) return "";
  if (text.length <= 200) return text;
  return `${text.slice(0, 197)}...`;
};

const makeBodyPreview = (body, bodyHtml) => {
  const htmlText = extractHtmlText(bodyHtml);
  const rawText = (htmlText || body || "").trim();
  const text = normalizeText(rawText);
  if (!text) return "";
  if (text.length <= 240) return text;
  return `${text.slice(0, 237)}...`;
};

const setStaffPreview = (blob) => {
  if (!staffPreview || !staffPreviewImg) return;
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }
  if (!blob) {
    staffPreview.hidden = true;
    staffPreviewImg.removeAttribute("src");
    return;
  }
  previewUrl = URL.createObjectURL(blob);
  staffPreviewImg.src = previewUrl;
  staffPreview.hidden = false;
};

const resetCropState = () => {
  cropState = {
    file: null,
    frameSize: 0,
    naturalWidth: 0,
    naturalHeight: 0,
    scale: 1,
    minScale: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    ready: false,
  };
};

const closeCropper = () => {
  if (cropModal) {
    cropModal.hidden = true;
  }
  if (cropFrame) {
    cropFrame.classList.remove("is-dragging");
  }
  if (cropObjectUrl) {
    URL.revokeObjectURL(cropObjectUrl);
    cropObjectUrl = "";
  }
  if (cropImage) {
    cropImage.removeAttribute("src");
  }
  resetCropState();
};

const clampOffsets = () => {
  const frame = cropState.frameSize;
  const scaledW = cropState.naturalWidth * cropState.scale;
  const scaledH = cropState.naturalHeight * cropState.scale;
  const minX = frame - scaledW;
  const minY = frame - scaledH;
  if (cropState.offsetX > 0) cropState.offsetX = 0;
  if (cropState.offsetY > 0) cropState.offsetY = 0;
  if (cropState.offsetX < minX) cropState.offsetX = minX;
  if (cropState.offsetY < minY) cropState.offsetY = minY;
};

const updateCropStyles = () => {
  if (!cropImage || !cropState.ready) return;
  cropImage.style.width = `${cropState.naturalWidth * cropState.scale}px`;
  cropImage.style.height = `${cropState.naturalHeight * cropState.scale}px`;
  cropImage.style.left = `${cropState.offsetX}px`;
  cropImage.style.top = `${cropState.offsetY}px`;
};

const initCropper = () => {
  if (!cropImage || !cropFrame) return;
  cropState.frameSize = cropFrame.clientWidth || 320;
  cropState.naturalWidth = cropImage.naturalWidth;
  cropState.naturalHeight = cropImage.naturalHeight;
  cropState.minScale = Math.max(
    cropState.frameSize / cropState.naturalWidth,
    cropState.frameSize / cropState.naturalHeight
  );
  cropState.scale = cropState.minScale;
  const scaledW = cropState.naturalWidth * cropState.scale;
  const scaledH = cropState.naturalHeight * cropState.scale;
  cropState.offsetX = (cropState.frameSize - scaledW) / 2;
  cropState.offsetY = (cropState.frameSize - scaledH) / 2;
  cropState.ready = true;
  updateCropStyles();
};

const openCropper = (file) => {
  if (!cropModal || !cropImage || !cropZoom) return;
  resetCropState();
  cropState.file = file;
  cropModal.hidden = false;
  cropZoom.value = "1";
  cropImage.onload = () => {
    initCropper();
  };
  cropObjectUrl = URL.createObjectURL(file);
  cropImage.src = cropObjectUrl;
};

const updateZoom = (value) => {
  if (!cropState.ready || !cropFrame) return;
  const frameSize = cropState.frameSize;
  const centerX = (frameSize / 2 - cropState.offsetX) / cropState.scale;
  const centerY = (frameSize / 2 - cropState.offsetY) / cropState.scale;
  cropState.scale = cropState.minScale * value;
  cropState.offsetX = frameSize / 2 - centerX * cropState.scale;
  cropState.offsetY = frameSize / 2 - centerY * cropState.scale;
  clampOffsets();
  updateCropStyles();
};

const createCroppedBlob = () => {
  if (!cropImage || !cropState.ready) return Promise.resolve(null);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  const scale = cropState.scale;
  const sx = -cropState.offsetX / scale;
  const sy = -cropState.offsetY / scale;
  const sSize = cropState.frameSize / scale;
  ctx.drawImage(cropImage, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/jpeg",
      0.9
    );
  });
};

photoInput?.addEventListener("change", () => {
  if (!photoInput?.files?.length) {
    croppedBlob = null;
    croppedName = "";
    setStaffPreview(null);
    return;
  }
  const file = photoInput.files[0];
  croppedBlob = null;
  croppedName = "";
  setStaffPreview(null);
  openCropper(file);
});

cropZoom?.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  updateZoom(parseFloat(target.value));
});

cropFrame?.addEventListener("pointerdown", (event) => {
  if (!cropState.ready) return;
  event.preventDefault();
  cropState.dragging = true;
  cropState.startX = event.clientX;
  cropState.startY = event.clientY;
  cropState.startOffsetX = cropState.offsetX;
  cropState.startOffsetY = cropState.offsetY;
  cropFrame.classList.add("is-dragging");
});

window.addEventListener("pointermove", (event) => {
  if (!cropState.dragging) return;
  cropState.offsetX = cropState.startOffsetX + (event.clientX - cropState.startX);
  cropState.offsetY = cropState.startOffsetY + (event.clientY - cropState.startY);
  clampOffsets();
  updateCropStyles();
});

window.addEventListener("pointerup", () => {
  if (!cropState.dragging) return;
  cropState.dragging = false;
  cropFrame?.classList.remove("is-dragging");
});

cropCancel?.addEventListener("click", () => {
  if (photoInput) {
    photoInput.value = "";
  }
  croppedBlob = null;
  croppedName = "";
  setStaffPreview(null);
  closeCropper();
});

cropConfirm?.addEventListener("click", async () => {
  const blob = await createCroppedBlob();
  if (!blob) {
    setStaffError("Unable to crop the image.");
    return;
  }
  const originalName = cropState.file?.name ?? "staff-photo.jpg";
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  croppedName = `${baseName}.jpg`;
  croppedBlob = blob;
  setStaffPreview(blob);
  closeCropper();
});

const setLoading = (loading) => {
  if (!form) return;
  const submitBtn = form.querySelector("button[type='submit']");
  if (!submitBtn) return;
  if (loading) {
    submitBtn.setAttribute("disabled", "disabled");
  } else {
    submitBtn.removeAttribute("disabled");
  }
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");
  setLoading(true);

  const formData = new FormData(form);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    const message =
      error?.code === "auth/invalid-credential"
        ? "Invalid email or password."
        : "Sign in failed. Please try again.";
    setError(message);
  } finally {
    setLoading(false);
  }
});

signoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
});

const renderStaffList = (list) => {
  if (!staffList) return;
  staffList.replaceChildren();
  if (!list.length) {
    const empty = document.createElement("p");
    empty.textContent = "No staff added yet.";
    staffList.appendChild(empty);
    return;
  }

  list.forEach((item) => {
    const data = item.data;
    const name = data.name ?? "Untitled";
    const title = data.title ?? "";
    const credentials = data.credentials ?? "";
    const photoUrl = data.photoUrl ?? "";

    const card = document.createElement("article");
    card.className = "staff-card staff-admin-card";
    card.dataset.id = item.id;

    const photoWrap = document.createElement("div");
    photoWrap.className = "staff-photo";
    if (photoUrl) {
      const img = document.createElement("img");
      img.src = photoUrl;
      img.alt = name;
      img.loading = "lazy";
      img.setAttribute("draggable", "false");
      photoWrap.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "staff-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.textContent = "No photo";
      placeholder.setAttribute("draggable", "false");
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

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "staff-delete";
    delBtn.textContent = "Delete";
    delBtn.setAttribute("draggable", "false");

    card.appendChild(photoWrap);
    card.appendChild(info);
    card.appendChild(delBtn);
    card.addEventListener("pointerdown", handleCardPointerDown);
    staffList.appendChild(card);
  });
};

const renderBlogList = (docs) => {
  if (!blogList) return;
  blogList.replaceChildren();
  if (!docs.length) {
    const empty = document.createElement("p");
    empty.textContent = "No blog posts yet.";
    blogList.appendChild(empty);
    return;
  }

  docs.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const title = data.title ?? "Untitled";
    const category = data.category ?? "";
    const date = formatDate(data.createdAt);
    const excerpt = makeExcerpt(data.excerpt);
    const preview = makeBodyPreview(data.body, data.bodyHtml);
    const coverUrl = data.coverImageUrl ?? "";

    const card = document.createElement("article");
    card.className = "card blog-card blog-admin-card";
    card.dataset.id = docSnapshot.id;

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

    const header = document.createElement("div");
    header.className = "blog-admin-header";

    const titleEl = document.createElement("h2");
    titleEl.textContent = title;
    header.appendChild(titleEl);

    const actions = document.createElement("div");
    actions.className = "blog-admin-actions";

    const editLink = document.createElement("a");
    editLink.href = `admin-blog-editor.html?id=${docSnapshot.id}`;
    editLink.textContent = "Edit";
    editLink.className = "blog-view";
    actions.appendChild(editLink);

    const viewLink = document.createElement("a");
    viewLink.href = `blog-post.html?id=${docSnapshot.id}`;
    viewLink.textContent = "View";
    viewLink.className = "blog-view";
    actions.appendChild(viewLink);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "blog-delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("draggable", "false");
    actions.appendChild(deleteBtn);

    header.appendChild(actions);
    body.appendChild(header);

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
      excerptEl.className = "blog-admin-excerpt";
      excerptEl.textContent = excerpt;
      body.appendChild(excerptEl);
    }

    if (preview) {
      const previewEl = document.createElement("p");
      previewEl.className = "blog-admin-preview";
      previewEl.textContent = preview;
      body.appendChild(previewEl);
    }

    card.appendChild(body);
    blogList.appendChild(card);
  });
};

const getIdsFromDom = () => {
  if (!staffList) return [];
  return Array.from(staffList.querySelectorAll(".staff-admin-card"))
    .map((card) => card.getAttribute("data-id"))
    .filter(Boolean);
};

const isSameOrder = (ids, list) => {
  if (ids.length !== list.length) return false;
  return ids.every((id, index) => id === list[index]?.id);
};

const persistOrderFromDom = async () => {
  const ids = getIdsFromDom();
  if (!ids.length || isSameOrder(ids, currentStaff)) return;
  const batch = writeBatch(db);
  ids.forEach((id, index) => {
    batch.update(doc(db, "staff", id), { order: index });
  });
  try {
    await batch.commit();
    setStaffSuccess("Order updated.");
  } catch (error) {
    setStaffError("Reorder failed. Please try again.");
  }
};

const getInsertReference = (container, x, y) => {
  const cards = Array.from(container.querySelectorAll(".staff-admin-card")).filter(
    (card) => card !== dragItem && card.style.display !== "none"
  );
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const midX = rect.left + rect.width / 2;
    const withinRow = y >= rect.top && y <= rect.bottom;
    if (y < midY || (withinRow && x < midX)) {
      return card;
    }
  }
  return null;
};

const ensurePlaceholder = (card) => {
  if (!staffList || !card) return null;
  if (!dragPlaceholder) {
    dragPlaceholder = document.createElement("div");
    dragPlaceholder.className = "staff-drop-placeholder";
    dragPlaceholder.style.height = `${card.getBoundingClientRect().height}px`;
  }
  return dragPlaceholder;
};

const handleCardPointerDown = (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest(".staff-delete")) return;
  if (event.button !== 0) return;
  event.preventDefault();
  const card = event.currentTarget;
  if (!(card instanceof HTMLElement)) return;

  dragItem = card;
  dragPending = true;
  dragActive = true;

  const rect = card.getBoundingClientRect();
  dragOffsetX = event.clientX - rect.left;
  dragOffsetY = event.clientY - rect.top;

  const placeholder = ensurePlaceholder(card);
  if (placeholder && staffList) {
    staffList.insertBefore(placeholder, card.nextSibling);
  }
  card.style.display = "none";

  const ghost = card.cloneNode(true);
  ghost.classList.add("staff-drag-ghost");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.transform = `translate3d(${event.clientX - dragOffsetX}px, ${event.clientY - dragOffsetY}px, 0)`;
  const deleteBtn = ghost.querySelector(".staff-delete");
  deleteBtn?.remove();
  document.body.appendChild(ghost);
  dragGhost = ghost;

  document.addEventListener("pointermove", handleCardPointerMove);
  document.addEventListener("pointerup", handleCardPointerUp, { once: true });
  document.addEventListener("pointercancel", handleCardPointerUp, { once: true });
};

const handleCardPointerMove = (event) => {
  if (!dragActive || !dragGhost) return;
  dragGhost.style.transform = `translate3d(${event.clientX - dragOffsetX}px, ${event.clientY - dragOffsetY}px, 0)`;
  if (!staffList || !dragPlaceholder) return;
  const reference = getInsertReference(staffList, event.clientX, event.clientY);
  if (!reference) {
    staffList.appendChild(dragPlaceholder);
    return;
  }
  if (reference === dragPlaceholder) return;
  staffList.insertBefore(dragPlaceholder, reference);
};

const handleCardPointerUp = async () => {
  dragActive = false;
  document.removeEventListener("pointermove", handleCardPointerMove);
  if (dragGhost) {
    dragGhost.remove();
  }
  if (dragItem) {
    dragItem.style.display = "";
    if (dragPlaceholder && staffList) {
      staffList.insertBefore(dragItem, dragPlaceholder);
    }
  }
  if (dragPlaceholder) {
    dragPlaceholder.remove();
  }
  dragPlaceholder = null;
  dragItem = null;
  dragGhost = null;
  if (dragPending) {
    dragPending = false;
    await persistOrderFromDom();
  }
};

const bindStaffListEvents = () => {
  staffList?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest(".staff-admin-card");
    const id = card?.getAttribute("data-id");
    if (!id) return;
    setStaffError("");
    setStaffSuccess("");

    if (target.classList.contains("staff-delete")) {
      try {
        await deleteDoc(doc(db, "staff", id));
        setStaffSuccess("Staff member removed.");
      } catch (error) {
        setStaffError("Delete failed. Please try again.");
      }
    }
  });

};

const bindBlogListEvents = () => {
  blogList?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains("blog-delete")) return;
    const card = target.closest(".blog-admin-card");
    const id = card?.getAttribute("data-id");
    if (!id) return;
    setBlogError("");
    setBlogSuccess("");
    try {
      await deleteDoc(doc(db, "blogPosts", id));
      setBlogSuccess("Blog post removed.");
    } catch (error) {
      setBlogError("Delete failed. Please try again.");
    }
  });
};

const bindStaffForm = () => {
  staffForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStaffError("");
    setStaffSuccess("");
    const formData = new FormData(staffForm);
    const name = String(formData.get("name") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const credentials = String(formData.get("credentials") ?? "").trim();
    const photoFile = formData.get("photoFile");

    if (!name) {
      setStaffError("Name is required.");
      return;
    }

    const submitBtn = staffForm.querySelector("button[type='submit']");
    submitBtn?.setAttribute("disabled", "disabled");

    try {
      let finalPhotoUrl = "";
      if (photoFile instanceof File && photoFile.size > 0 && !croppedBlob) {
        setStaffError("Please crop the photo before saving.");
        submitBtn?.removeAttribute("disabled");
        return;
      }

      if (croppedBlob) {
        setStaffSuccess("Uploading image...");
        const safeName = (croppedName || "staff-photo.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileRef = ref(storage, `staff/${Date.now()}-${safeName}`);
        await uploadBytes(fileRef, croppedBlob);
        finalPhotoUrl = await getDownloadURL(fileRef);
      }

      const nextOrder = currentStaff.length;
      await addDoc(collection(db, "staff"), {
        name,
        title,
        credentials,
        photoUrl: finalPhotoUrl,
        createdAt: serverTimestamp(),
        order: nextOrder,
      });
      staffForm.reset();
      croppedBlob = null;
      croppedName = "";
      setStaffPreview(null);
      setStaffSuccess("Staff member added.");
    } catch (error) {
      setStaffError("Save failed. Please try again.");
    } finally {
      submitBtn?.removeAttribute("disabled");
    }
  });
};

const loadContactRecipient = async () => {
  if (!contactInput) return;
  setContactError("");
  setContactSuccess("");
  try {
    const snapshot = await getDoc(doc(db, "siteConfig", "contact"));
    if (snapshot.exists()) {
      const data = snapshot.data();
      const recipientEmail =
        typeof data.recipientEmail === "string" ? data.recipientEmail.trim() : "";
      contactInput.value = recipientEmail;
    } else {
      contactInput.value = "";
    }
  } catch (error) {
    setContactError("Unable to load recipient email.");
  }
};

const bindContactForm = () => {
  contactForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!contactInput) return;
    setContactError("");
    setContactSuccess("");
    const email = contactInput.value.trim();
    if (email && !contactInput.checkValidity()) {
      setContactError("Enter a valid email address.");
      return;
    }
    const submitBtn = contactForm.querySelector("button[type='submit']");
    submitBtn?.setAttribute("disabled", "disabled");
    try {
      await setDoc(
        doc(db, "siteConfig", "contact"),
        { recipientEmail: email },
        { merge: true }
      );
      setContactSuccess(email ? "Recipient updated." : "Recipient cleared.");
    } catch (error) {
      setContactError("Save failed. Please try again.");
    } finally {
      submitBtn?.removeAttribute("disabled");
    }
  });
};

let staffUnsubscribe = null;
let blogUnsubscribe = null;

const startStaffListener = () => {
  if (!staffList) return;
  if (staffUnsubscribe) staffUnsubscribe();
  const staffQuery = query(collection(db, "staff"), orderBy("order", "asc"));
  staffUnsubscribe = onSnapshot(
    staffQuery,
    (snapshot) => {
      const list = snapshot.docs.map((docSnapshot, index) => {
        const data = docSnapshot.data();
        const order = typeof data.order === "number" ? data.order : index;
        return {
          id: docSnapshot.id,
          data,
          order,
        };
      });
      list.sort((a, b) => a.order - b.order);
      currentStaff = list;
      renderStaffList(list);
      const needsNormalize = list.some((item, index) => item.order !== index);
      if (needsNormalize) {
        const batch = writeBatch(db);
        list.forEach((item, idx) => {
          batch.update(doc(db, "staff", item.id), { order: idx });
        });
        batch.commit().catch(() => {
          setStaffError("Unable to normalize staff order.");
        });
      }
    },
    () => {
      setStaffError("Unable to load staff list.");
    }
  );
};

const startBlogListener = () => {
  if (!blogList) return;
  if (blogUnsubscribe) blogUnsubscribe();
  const blogQuery = query(collection(db, "blogPosts"), orderBy("createdAt", "desc"));
  blogUnsubscribe = onSnapshot(
    blogQuery,
    (snapshot) => {
      renderBlogList(snapshot.docs);
    },
    () => {
      setBlogError("Unable to load blog posts.");
    }
  );
};

const stopStaffListener = () => {
  if (staffUnsubscribe) {
    staffUnsubscribe();
    staffUnsubscribe = null;
  }
};

const stopBlogListener = () => {
  if (blogUnsubscribe) {
    blogUnsubscribe();
    blogUnsubscribe = null;
  }
};

bindStaffListEvents();
bindStaffForm();
bindBlogListEvents();
bindContactForm();

onAuthStateChanged(auth, (user) => {
  if (user) {
    setVisible(authSection, false);
    setVisible(adminSection, true);
    if (adminUser) {
      adminUser.textContent = user.email ? `Signed in as ${user.email}` : "Signed in";
    }
    startBlogListener();
    startStaffListener();
    loadContactRecipient();
  } else {
    setVisible(authSection, true);
    setVisible(adminSection, false);
    if (adminUser) {
      adminUser.textContent = "";
    }
    if (contactInput) {
      contactInput.value = "";
    }
    setContactError("");
    setContactSuccess("");
    stopBlogListener();
    stopStaffListener();
  }
});
