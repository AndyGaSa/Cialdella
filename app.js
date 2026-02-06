const SUPABASE_URL = "https://ejfapcgmmbgdxakzqkfe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_RCdVm_zuyZQHyeKwLSvwsQ_DWnGCMY2";
const GATE_EMAILS = {
  fiona: "andybdn@hotmail.es",
  andy: "iam@andygarcia.dev",
};

const hasSupabase = Boolean(window.supabase && window.supabase.createClient);
const supabaseClient = hasSupabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const { createApp } = window.Vue;

createApp({
  data() {
    return {
      gateUnlocked: false,
      gateInput: "",
      gateError: "",
      gateUser: "fiona",
      gateFloatItems: [],
      hasInitialized: false,
      isMobile: window.matchMedia("(max-width: 960px)").matches,
      posts: [],
      likes: [],
      currentLike: null,
      likesOwner: "fiona",
      likesEmojis: {
        fiona: "🌸",
        andy: "🤘",
      },
      likesTheme: {
        fiona: "",
        andy: "",
      },
      view: "list",
      currentPost: null,
      currentUserId: "",
      editor: {
        title: "",
        body: "",
        status: "draft",
      },
      likesEditor: {
        id: "",
        title: "",
        description: "",
        imageFile: null,
        imagePreview: "",
        imageUrl: "",
        isObjectUrl: false,
      },
      likesEditorOpen: false,
      pendingMedia: [],
      isEdit: false,
      isSavingLike: false,
      isLikesLoading: false,
      likesError: "",
      errorMsg: "",
      isSavingPost: false,
      lightbox: {
        open: false,
        url: "",
      },
      isLoading: false,
    };
  },
  computed: {
    likesOwnerName() {
      return this.likesOwner === "andy" ? "Andy" : "Fiona";
    },
    likesOwnerLabels() {
      return {
        fiona: `Fio ${this.likesEmojis.fiona}`,
        andy: `Andy ${this.likesEmojis.andy}`,
      };
    },
  },
  mounted() {
    const appRoot = document.getElementById("app");
    if (appRoot) {
      appRoot.classList.add("vue-ready");
    }
    this.buildGateFloats();
    if (hasSupabase && supabaseClient) {
      supabaseClient.auth.getSession().then(({ data }) => {
        if (data?.session) {
          this.gateUnlocked = true;
          this.currentUserId = data.session.user?.id || "";
        }
      });
    }
  },
  watch: {
    gateUnlocked(next) {
      if (next) {
        this.initializeApp();
      }
    },
  },
  beforeUnmount() {
    if (this.mediaQuery && this.handleMediaChange) {
      this.mediaQuery.removeEventListener("change", this.handleMediaChange);
    }
    window.removeEventListener("keydown", this.handleKeydown);
  },
  methods: {
    buildGateFloats() {
      const assets = [
        "assets/limon.png",
        "assets/argentina.png",
        "assets/alaca.png",
        "assets/agz.jpg",
      ];
      const shuffle = (list) => [...list].sort(() => Math.random() - 0.5);
      const rand = (min, max) => Math.random() * (max - min) + min;
      const baseLeft = [8, 42, 76, 90];
      const items = shuffle(assets).map((url, idx) => {
        const jitter = rand(-3, 3);
        return {
          url,
          left: `${Math.max(6, Math.min(92, baseLeft[idx] + jitter))}%`,
          duration: `${rand(16, 22).toFixed(1)}s`,
          delay: `${rand(0, 2.8).toFixed(1)}s`,
        };
      });
      this.gateFloatItems = items;
    },
    initializeApp() {
      if (this.hasInitialized) return;
      this.hasInitialized = true;
      if (!hasSupabase) {
        this.errorMsg = "Supabase no está cargado. Abre la página con internet o en GitHub Pages.";
        return;
      }
      this.lightbox = { open: false, url: "" };
      this.mediaQuery = window.matchMedia("(max-width: 960px)");
      this.handleMediaChange = (event) => {
        this.isMobile = event.matches;
      };
      this.mediaQuery.addEventListener("change", this.handleMediaChange);
      window.addEventListener("keydown", this.handleKeydown);
      this.setLikesTheme();
      this.setLikesEmojis();
      this.loadCachedData();
      this.loadPosts();
      this.loadLikes();
    },
    storageAvailable() {
      try {
        const testKey = "__cialdella_test__";
        localStorage.setItem(testKey, "1");
        localStorage.removeItem(testKey);
        return true;
      } catch (err) {
        return false;
      }
    },
    readCache(key) {
      if (!this.storageAvailable()) return null;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.ts) return null;
        const age = Date.now() - parsed.ts;
        const ttl = 5 * 60 * 1000;
        if (age > ttl) return null;
        return parsed.data;
      } catch (err) {
        return null;
      }
    },
    writeCache(key, data) {
      if (!this.storageAvailable()) return;
      try {
        localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
      } catch (err) {
        // ignore storage failures
      }
    },
    clearCache(key) {
      if (!this.storageAvailable()) return;
      try {
        localStorage.removeItem(key);
      } catch (err) {
        // ignore storage failures
      }
    },
    loadCachedData() {
      const cachedPosts = this.readCache("cialdella_posts");
      if (cachedPosts?.length) {
        this.posts = cachedPosts;
      }
      const cachedLikes = this.readCache("cialdella_likes");
      if (cachedLikes) {
        if (cachedLikes.fiona?.length) {
          this.likes = cachedLikes.fiona;
          this.likesOwner = "fiona";
        } else if (cachedLikes.andy?.length) {
          this.likes = cachedLikes.andy;
          this.likesOwner = "andy";
        }
      }
    },
    hasHtml(value = "") {
      return /<\/?[a-z][\s\S]*>/i.test(value);
    },
    plainTextLines(html = "") {
      if (!html) return "";
      const holder = document.createElement("div");
      const withBreaks = html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n");
      holder.innerHTML = withBreaks;
      return (holder.innerText || holder.textContent || "")
        .replace(/\r/g, "")
        .replace(/\n\s*\n+/g, "\n")
        .trim();
    },
    plainTextInline(html = "") {
      if (!html) return "";
      const holder = document.createElement("div");
      const withSpaces = html
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<\/(p|div|li|h[1-6])>/gi, " ");
      holder.innerHTML = withSpaces;
      return (holder.innerText || holder.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
    },
    sealLetter(html = "") {
      const text = this.plainTextLines(html);
      if (!text) return "";
      const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return "";
      const lastLine = lines[lines.length - 1];
      const cleaned = lastLine.replace(/[^a-zA-Z]+$/g, "");
      if (!cleaned) return "";
      const lastChar = cleaned.slice(-1).toLowerCase();
      if (lastChar === "a" || lastChar === "f") return lastChar.toUpperCase();
      return "";
    },
    renderContent(value = "") {
      if (!value) return "";
      if (this.hasHtml(value)) return value;
      const holder = document.createElement("div");
      holder.textContent = value;
      return holder.innerHTML.replace(/\n/g, "<br />");
    },
    setEditorContent(target, html) {
      const el = target === "likes" ? this.$refs.likesBody : this.$refs.editorBody;
      if (!el) return;
      el.innerHTML = this.renderContent(html || "");
    },
    syncEditorHtml(target) {
      const el = target === "likes" ? this.$refs.likesBody : this.$refs.editorBody;
      if (!el) return;
      const html = el.innerHTML || "";
      if (target === "likes") {
        this.likesEditor.description = html;
      } else {
        this.editor.body = html;
      }
    },
    applyFormat(command, value, target) {
      const el = target === "likes" ? this.$refs.likesBody : this.$refs.editorBody;
      if (!el) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      el.focus();
      if (command === "hiliteColor") {
        const next = value;
        document.execCommand("hiliteColor", false, next);
        document.execCommand("backColor", false, next);
      } else {
        document.execCommand(command, false, value);
      }
      this.syncEditorHtml(target);
    },
    normalizeColor(value = "") {
      if (!value) return "";
      const lower = value.toLowerCase().trim();
      if (lower === "transparent") return "transparent";
      if (lower.startsWith("#")) {
        const hex = lower.slice(1);
        const full = hex.length === 3
          ? hex.split("").map((c) => c + c).join("")
          : hex;
        const r = parseInt(full.slice(0, 2), 16);
        const g = parseInt(full.slice(2, 4), 16);
        const b = parseInt(full.slice(4, 6), 16);
        return `rgb(${r}, ${g}, ${b})`;
      }
      return lower.replace(/\s+/g, "");
    },
    onEditorInput() {
      this.syncEditorHtml("post");
    },
    onLikesInput() {
      this.syncEditorHtml("likes");
    },
    scrollToTop() {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    },
    submitGate() {
      const trimmed = this.gateInput.trim();
      if (!trimmed) return;
      if (!hasSupabase || !supabaseClient) {
        this.gateError = "No puedo validar sin internet.";
        return;
      }
      this.gateError = "";
      const email = GATE_EMAILS[this.gateUser] || GATE_EMAILS.fiona;
      supabaseClient.auth
        .signInWithPassword({ email, password: trimmed })
        .then(({ data, error }) => {
          if (error || !data?.session) {
            this.gateError = "contraseña incorrecta";
            return;
          }
          this.gateUnlocked = true;
          this.currentUserId = data.session.user?.id || "";
          this.gateInput = "";
        });
    },
    friendlyDate(dateString) {
      if (!dateString) return "";
      const formatter = new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      return formatter.format(new Date(dateString));
    },
    setLikesTheme() {
      const palette = [
        "linear-gradient(140deg, #f7ede2 0%, #f5cac3 100%)",
        "linear-gradient(140deg, #f7ede2 0%, #f6bd60 100%)",
        "linear-gradient(140deg, #f7ede2 0%, #f28482 100%)",
        "linear-gradient(140deg, #f7ede2 0%, #84a59d 100%)",
        "linear-gradient(140deg, #f5cac3 0%, #f28482 100%)",
      ];
      const pick = (exclude) => {
        const options = palette.filter((item) => item !== exclude);
        return options[Math.floor(Math.random() * options.length)];
      };
      const fiona = pick();
      this.likesTheme = {
        fiona,
        andy: pick(fiona),
      };
    },
    setLikesEmojis() {
      const fiona = ["🌸", "🌺", "🌷"];
      const andy = ["🤘", "🤠", "😇"];
      this.likesEmojis = {
        fiona: fiona[Math.floor(Math.random() * fiona.length)],
        andy: andy[Math.floor(Math.random() * andy.length)],
      };
    },
    excerpt(text = "") {
      const clean = this.plainTextLines(text).trim();
      return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
    },
    likesExcerpt(text = "") {
      const clean = this.plainTextInline(text);
      if (!clean) return "";
      const words = clean.split(" ");
      return words.length > 4 ? `${words.slice(0, 4).join(" ")}...` : clean;
    },
    isFileName(value = "") {
      return /\.(png|jpe?g|gif|webp|mp3|wav|m4a|mp4|mov|m4v)$/i.test(value.trim());
    },
    shouldShowCaption(item) {
      if (!item?.caption) return false;
      return !this.isFileName(item.caption);
    },
    async loadPosts() {
      this.lightbox = { open: false, url: "" };
      this.isLoading = true;
      const { data, error } = await supabaseClient
        .from("posts")
        .select("id,title,body,media,created_at,updated_at,status,owner")
        .order("created_at", { ascending: false });

      if (error) {
        this.errorMsg = `No pude cargar los posts. ${error.message}`;
        this.isLoading = false;
        return;
      }

      this.posts = data || [];
      this.writeCache("cialdella_posts", this.posts);
      this.view = "list";
      this.isLoading = false;
    },
    async loadLikes(owner = this.likesOwner) {
      this.likesOwner = owner;
      this.currentLike = null;
      this.isLikesLoading = true;
      const { data, error } = await supabaseClient
        .from("likes")
        .select("id,title,description,image_url,created_at,person")
        .eq("person", owner)
        .order("created_at", { ascending: false });

      if (error) {
        this.likesError = `No pude cargar los gustos. ${error.message}`;
        this.isLikesLoading = false;
        return;
      }

      this.likes = data || [];
      const cachedLikes = this.readCache("cialdella_likes") || {};
      cachedLikes[owner] = this.likes;
      this.writeCache("cialdella_likes", cachedLikes);
      this.isLikesLoading = false;
    },
    async openPost(id) {
      const { data, error } = await supabaseClient
        .from("posts")
        .select("id,title,body,media,created_at,updated_at,status,owner")
        .eq("id", id)
        .single();

      if (error) {
        this.errorMsg = "No encontré ese post.";
        return;
      }

      this.currentPost = data;
      this.view = "detail";
      this.scrollToTop();
    },
    async goList() {
      await this.loadPosts();
      this.view = "list";
    },
    async goLikesList(owner = this.likesOwner) {
      await this.loadLikes(owner);
      this.likesEditorOpen = false;
      this.view = "likes";
    },
    async setLikesOwner(owner) {
      if (this.likesOwner === owner) return;
      await this.loadLikes(owner);
    },
    openLike(item) {
      this.currentLike = item;
      this.view = "likes-detail";
    },
    goNew() {
      this.isEdit = false;
      this.currentPost = null;
      this.editor = { title: "", body: "", status: "draft" };
      this.pendingMedia = [];
      this.view = "editor";
      this.$nextTick(() => this.setEditorContent("post", this.editor.body));
    },
    goSeed() {
      this.isEdit = false;
      this.currentPost = null;
      this.editor = {
        title: "✨ hola fiona soy tu blog",
        body:
          "tucu tuc tucu tucu habla de ti de helado de chicles de sara de que te hace feliz.",
        status: "draft",
      };
      this.pendingMedia = [];
      this.view = "editor";
      this.$nextTick(() => this.setEditorContent("post", this.editor.body));
    },
    openEdit() {
      if (!this.currentPost) return;
      this.isEdit = true;
      this.editor = {
        title: this.currentPost.title,
        body: this.currentPost.body,
        status: this.currentPost.status || "published",
      };
      this.pendingMedia = Array.isArray(this.currentPost.media)
        ? [...this.currentPost.media]
        : [];
      this.view = "editor";
      this.$nextTick(() => this.setEditorContent("post", this.editor.body));
    },
    handleFiles(event) {
      const files = Array.from(event.target.files || []);
      files.forEach((file) => {
        if (file.type.startsWith("image/")) {
          this.pendingMedia.push({ type: "image", file, name: file.name });
        } else if (file.type.startsWith("audio/")) {
          this.pendingMedia.push({ type: "audio", file, name: file.name });
        } else if (file.type.startsWith("video/")) {
          this.pendingMedia.push({ type: "video", file, name: file.name });
        }
      });
      event.target.value = "";
    },
    handleLikeImage(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (this.likesEditor.imagePreview) {
        if (this.likesEditor.isObjectUrl) {
          URL.revokeObjectURL(this.likesEditor.imagePreview);
        }
      }
      this.likesEditor.imageFile = file;
      this.likesEditor.imagePreview = URL.createObjectURL(file);
      this.likesEditor.isObjectUrl = true;
      event.target.value = "";
    },
    clearLikeImage() {
      if (this.likesEditor.imagePreview) {
        if (this.likesEditor.isObjectUrl) {
          URL.revokeObjectURL(this.likesEditor.imagePreview);
        }
      }
      this.likesEditor.imageFile = null;
      this.likesEditor.imagePreview = "";
      this.likesEditor.imageUrl = "";
      this.likesEditor.isObjectUrl = false;
    },
    removeMedia(index) {
      this.pendingMedia.splice(index, 1);
    },
    openImage(url) {
      if (!url) return;
      this.lightbox = { open: true, url };
      document.body.classList.add("no-scroll");
    },
    closeLightbox() {
      this.lightbox = { open: false, url: "" };
      document.body.classList.remove("no-scroll");
    },
    async downloadImage() {
      if (!this.lightbox.url) return;

      const url = this.lightbox.url;

      if (navigator.share && navigator.canShare) {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const ext = blob.type.split("/")[1] || "jpg";
          const file = new File([blob], `foto.${ext}`, { type: blob.type });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "foto" });
            return;
          }
        } catch (err) {
          // fallback below
        }
      }

      const link = document.createElement("a");
      link.href = url;
      link.download = "foto";
      link.target = "_blank";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    handleKeydown(event) {
      if (event.key === "Escape" && this.lightbox.open) {
        this.closeLightbox();
      }
    },
    toggleLikesEditor() {
      this.likesEditorOpen = !this.likesEditorOpen;
      if (this.likesEditorOpen) {
        this.$nextTick(() => this.setEditorContent("likes", this.likesEditor.description));
      }
    },
    openLikeEdit() {
      if (!this.currentLike) return;
      this.likesOwner = this.currentLike.person || this.likesOwner;
      this.likesEditorOpen = true;
      this.view = "likes";
      this.likesEditor = {
        id: this.currentLike.id,
        title: this.currentLike.title,
        description: this.currentLike.description,
        imageFile: null,
        imagePreview: this.currentLike.image_url || "",
        imageUrl: this.currentLike.image_url || "",
        isObjectUrl: false,
      };
      this.$nextTick(() => this.setEditorContent("likes", this.likesEditor.description));
    },
    async deleteLike() {
      if (!this.currentLike) return;
      const ok = confirm("¿Seguro que quieres borrar este gusto?");
      if (!ok) return;
      const { error } = await supabaseClient
        .from("likes")
        .delete()
        .eq("id", this.currentLike.id);
      if (error) {
        alert(error.message);
        return;
      }
      this.currentLike = null;
      await this.loadLikes(this.likesOwner);
      this.view = "likes";
    },
    async saveLike() {
      if (this.isSavingLike) return;
      this.isSavingLike = true;
      try {
        const title = this.likesEditor.title.trim();
        const description = this.likesEditor.description.trim();
        const descriptionText = this.plainTextInline(description);
        if (!title || !descriptionText) return;

        let imageUrl = this.likesEditor.imageUrl || "";

        if (this.likesEditor.imageFile) {
          const ext = this.likesEditor.imageFile.name.split(".").pop();
          const path = `likes/${crypto.randomUUID()}.${ext}`;
          const { data, error } = await supabaseClient.storage
            .from("media")
            .upload(path, this.likesEditor.imageFile, { upsert: true });

          if (error) {
            alert(error.message);
            return;
          }

          const { data: urlData } = supabaseClient.storage
            .from("media")
            .getPublicUrl(data.path);

          imageUrl = urlData.publicUrl;
        }

        if (this.likesEditor.id) {
          const { error } = await supabaseClient
            .from("likes")
            .update({
              title,
              description,
              image_url: imageUrl || null,
              person: this.likesOwner,
            })
            .eq("id", this.likesEditor.id);

          if (error) {
            alert(error.message);
            return;
          }
        } else {
          const { error } = await supabaseClient
            .from("likes")
            .insert({
              title,
              description,
              image_url: imageUrl || null,
              person: this.likesOwner,
            });

          if (error) {
            alert(error.message);
            return;
          }
        }

        this.likesEditor = {
          id: "",
          title: "",
          description: "",
          imageFile: null,
          imagePreview: "",
          imageUrl: "",
          isObjectUrl: false,
        };
        this.likesEditorOpen = false;
        this.clearCache("cialdella_likes");
        await this.loadLikes();
      } finally {
        this.isSavingLike = false;
      }
    },
    async savePost() {
      if (this.isSavingPost) return;
      this.isSavingPost = true;
      try {
        const title = this.editor.title.trim();
        const body = this.editor.body.trim();
        const bodyText = this.plainTextInline(body);
        if (!title || !bodyText) return;

        let postId = this.currentPost?.id;

        if (!postId) {
          const { data, error } = await supabaseClient
            .from("posts")
          .insert({
            title,
            body,
            status: this.editor.status || "published",
            owner: this.currentUserId || null,
          })
            .select("id")
            .single();

          if (error) {
            alert(error.message);
            return;
          }

          postId = data.id;
        } else {
          const { error } = await supabaseClient
            .from("posts")
          .update({
            title,
            body,
            status: this.editor.status || "published",
            updated_at: new Date().toISOString(),
          })
            .eq("id", postId);

          if (error) {
            alert(error.message);
            return;
          }
        }

        const uploadedMedia = [];

        for (const item of this.pendingMedia) {
          if (!item.file) {
            uploadedMedia.push(item);
            continue;
          }

          const ext = item.file.name.split(".").pop();
          const path = `${postId}/${crypto.randomUUID()}.${ext}`;
          const { data, error } = await supabaseClient.storage
            .from("media")
            .upload(path, item.file, { upsert: true });

          if (error) {
            alert(error.message);
            return;
          }

          const { data: urlData } = supabaseClient.storage
            .from("media")
            .getPublicUrl(data.path);

          uploadedMedia.push({
            type: item.type,
            url: urlData.publicUrl,
            caption: item.caption || "",
          });
        }

        const { error: mediaError } = await supabaseClient
          .from("posts")
          .update({ media: uploadedMedia, updated_at: new Date().toISOString() })
          .eq("id", postId);

        if (mediaError) {
          alert(mediaError.message);
          return;
        }

        await this.loadPosts();
        await this.openPost(postId);
        this.clearCache("cialdella_posts");
      } finally {
        this.isSavingPost = false;
      }
    },
    async saveDraft() {
      this.editor.status = "draft";
      await this.savePost();
    },
    async publishPost() {
      this.editor.status = "published";
      await this.savePost();
    },
    async deletePost() {
      if (!this.currentPost) return;
      const ok = confirm("¿Seguro que quieres borrar este post?");
      if (!ok) return;
      const { error } = await supabaseClient
        .from("posts")
        .delete()
        .eq("id", this.currentPost.id);
      if (error) {
        alert(error.message);
        return;
      }
      this.currentPost = null;
      this.clearCache("cialdella_posts");
      await this.loadPosts();
      this.view = "list";
    },
  },
}).mount("#app");
