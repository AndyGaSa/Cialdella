const SUPABASE_URL = "https://ejfapcgmmbgdxakzqkfe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_RCdVm_zuyZQHyeKwLSvwsQ_DWnGCMY2";
const EDIT_CODE = "tengo1bigote";

const hasSupabase = Boolean(window.supabase && window.supabase.createClient);
const supabaseClient = hasSupabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const { createApp } = window.Vue;

createApp({
  data() {
    const savedCode = sessionStorage.getItem("cialdella_code") || "";
    return {
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
      editor: {
        code: savedCode,
        title: "",
        body: "",
      },
      likesEditor: {
        code: savedCode,
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
      isLikesLoading: false,
      likesError: "",
      errorMsg: "",
      lightbox: {
        open: false,
        url: "",
      },
      isLoading: false,
    };
  },
  computed: {
    detailBody() {
      return (this.currentPost?.body || "").replace(/\n/g, "<br />");
    },
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
    this.loadPosts();
    this.loadLikes();
  },
  beforeUnmount() {
    if (this.mediaQuery && this.handleMediaChange) {
      this.mediaQuery.removeEventListener("change", this.handleMediaChange);
    }
    window.removeEventListener("keydown", this.handleKeydown);
  },
  methods: {
    checkCode(code) {
      return code === EDIT_CODE;
    },
    getSavedCode() {
      return sessionStorage.getItem("cialdella_code") || "";
    },
    rememberCode(code) {
      sessionStorage.setItem("cialdella_code", code);
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
      const clean = text.replace(/\s+/g, " ").trim();
      return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
    },
    likesExcerpt(text = "") {
      const clean = text.replace(/\s+/g, " ").trim();
      if (!clean) return "";
      const words = clean.split(" ");
      return words.length > 4 ? `${words.slice(0, 4).join(" ")}...` : clean;
    },
    isFileName(value = "") {
      return /\.(png|jpe?g|gif|webp|mp3|wav|m4a)$/i.test(value.trim());
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
        .select("id,title,body,media,created_at,updated_at")
        .order("created_at", { ascending: false });

      if (error) {
        this.errorMsg = `No pude cargar los posts. ${error.message}`;
        this.isLoading = false;
        return;
      }

      this.posts = data || [];
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
      this.isLikesLoading = false;
    },
    async openPost(id) {
      const { data, error } = await supabaseClient
        .from("posts")
        .select("id,title,body,media,created_at,updated_at")
        .eq("id", id)
        .single();

      if (error) {
        this.errorMsg = "No encontré ese post.";
        return;
      }

      this.currentPost = data;
      this.view = "detail";
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
      if (!this.isMobile) return;
      this.currentLike = item;
      this.view = "likes-detail";
    },
    goNew() {
      this.isEdit = false;
      this.currentPost = null;
      this.editor = { code: this.getSavedCode(), title: "", body: "" };
      this.pendingMedia = [];
      this.view = "editor";
    },
    goSeed() {
      this.isEdit = false;
      this.currentPost = null;
      this.editor = {
        code: this.getSavedCode(),
        title: "✨ hola fiona soy tu blog",
        body:
          "tucu tuc tucu tucu habla de ti de helado de chicles de sara de que te hace feliz.",
      };
      this.pendingMedia = [];
      this.view = "editor";
    },
    openEdit() {
      if (!this.currentPost) return;
      this.isEdit = true;
      this.editor = {
        code: this.getSavedCode(),
        title: this.currentPost.title,
        body: this.currentPost.body,
      };
      this.pendingMedia = Array.isArray(this.currentPost.media)
        ? [...this.currentPost.media]
        : [];
      this.view = "editor";
    },
    handleFiles(event) {
      const files = Array.from(event.target.files || []);
      files.forEach((file) => {
        if (file.type.startsWith("image/")) {
          this.pendingMedia.push({ type: "image", file, name: file.name });
        } else if (file.type.startsWith("audio/")) {
          this.pendingMedia.push({ type: "audio", file, name: file.name });
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
      if (this.likesEditorOpen && !this.likesEditor.code) {
        this.likesEditor.code = this.getSavedCode();
      }
    },
    openLikeEdit() {
      if (!this.currentLike) return;
      this.likesOwner = this.currentLike.person || this.likesOwner;
      this.likesEditorOpen = true;
      this.view = "likes";
      this.likesEditor = {
        code: this.getSavedCode(),
        id: this.currentLike.id,
        title: this.currentLike.title,
        description: this.currentLike.description,
        imageFile: null,
        imagePreview: this.currentLike.image_url || "",
        imageUrl: this.currentLike.image_url || "",
        isObjectUrl: false,
      };
    },
    async saveLike() {
      const trimmedCode = this.likesEditor.code.trim();
      if (!this.checkCode(trimmedCode)) {
        alert("codigo secreto incorrecto");
        return;
      }
      this.rememberCode(trimmedCode);

      const title = this.likesEditor.title.trim();
      const description = this.likesEditor.description.trim();
      if (!title || !description) return;

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
        code: this.getSavedCode(),
        id: "",
        title: "",
        description: "",
        imageFile: null,
        imagePreview: "",
        imageUrl: "",
        isObjectUrl: false,
      };
      this.likesEditorOpen = false;
      await this.loadLikes();
    },
    async savePost() {
      const trimmedCode = this.editor.code.trim();
      if (!this.checkCode(trimmedCode)) {
        alert("codigo secreto incorrecto");
        return;
      }
      this.rememberCode(trimmedCode);

      const title = this.editor.title.trim();
      const body = this.editor.body.trim();
      if (!title || !body) return;

      let postId = this.currentPost?.id;

      if (!postId) {
        const { data, error } = await supabaseClient
          .from("posts")
          .insert({ title, body })
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
          .update({ title, body, updated_at: new Date().toISOString() })
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
    },
  },
}).mount("#app");
