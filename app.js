"use strict";
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );

/* ---------- Skema form (kunci = tag docxtemplater) ---------- */
const BASIC = [
  ["nama_lengkap", "Nama Lengkap"],
  ["telepon", "Telepon"],
  ["email", "Email"],
  ["linkedin", "LinkedIn (opsional)"],
  ["instagram", "Instagram (opsional)"],
  ["facebook", "Facebook (opsional)"],
  ["alamat", "Alamat (Kota, Provinsi)"],
];
const LISTS = {
  pendidikan: {
    t: "Pendidikan",
    f: [
      ["nama_institusi", "Institusi"],
      ["lokasi_institusi", "Lokasi"],
      ["periode_pendidikan", "Periode"],
      ["gelar", "Gelar"],
      ["jurusan", "Jurusan"],
      ["ipk", "IPK"],
      ["deskripsi_pendidikan", "Deskripsi", "t"],
    ],
  },
  pengalaman: {
    t: "Pengalaman Kerja",
    f: [
      ["posisi_kerja", "Posisi"],
      ["nama_perusahaan", "Perusahaan"],
      ["periode_kerja", "Periode"],
      ["tipe_pekerjaan", "Tipe Pekerjaan"],
      ["lokasi_kerja", "Lokasi"],
      ["sistem_kerja", "Sistem Kerja"],
      ["deskripsi_pekerjaan", "Deskripsi", "t"],
    ],
  },
  organisasi: {
    t: "Organisasi",
    f: [
      ["nama_organisasi", "Organisasi"],
      ["peran", "Peran"],
      ["periode_organisasi", "Periode"],
      ["deskripsi_organisasi", "Deskripsi", "t"],
    ],
  },
  proyek: {
    t: "Proyek",
    f: [
      ["nama_proyek", "Nama Proyek"],
      ["pemberi_proyek", "Pemberi Proyek"],
      ["periode_proyek", "Periode"],
      ["tipe_proyek", "Tipe"],
      ["lokasi_proyek", "Lokasi"],
      ["deskripsi_proyek", "Deskripsi", "t"],
    ],
  },
  pelatihan: {
    t: "Pelatihan & Kursus",
    f: [
      ["nama_pelatihan", "Nama Pelatihan"],
      ["penyelenggara", "Penyelenggara"],
      ["tahun_pelatihan", "Tahun"],
    ],
  },
  skills: {
    t: "Skills",
    f: [
      ["nama_skill", "Nama Skill"],
      ["jenis_skill", "Jenis / Level"],
    ],
  },
};
const blank = () => {
  const d = { profil_singkat: "" };
  BASIC.forEach(([k]) => (d[k] = ""));
  Object.keys(LISTS).forEach((k) => (d[k] = []));
  return d;
};
const blankItem = (k) => Object.fromEntries(LISTS[k].f.map(([f]) => [f, ""]));
let data = blank(),
  templates = [],
  current = "";

/* ---------- Template dinamis dari folder templates/ ---------- */
const niceName = (f) =>
  f
    .replace(/\.docx$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
async function listTemplates() {
  try {
    // 1) Directory listing (Live Server, python -m http.server, nginx autoindex)
    const r = await fetch("templates/");
    if (r.ok) {
      const t = await r.text();
      const n = [...t.matchAll(/href="([^"?#]+\.docx)"/gi)].map((m) =>
        decodeURIComponent(m[1].split("/").pop())
      );
      if (n.length) return [...new Set(n)].sort();
    }
  } catch {}
  try {
    const r = await fetch("templates/index.json");
    if (r.ok) return await r.json();
  } catch {} // 2) manifest
  const f = []; // 3) probe pola template_ats_N.docx
  for (let i = 1; i <= 10; i++) {
    const n = `template_ats_${i}.docx`;
    try {
      if ((await fetch("templates/" + n, { method: "HEAD" })).ok) f.push(n);
    } catch {}
  }
  return f;
}
async function initTemplates() {
  templates = await listTemplates();
  const g = $("#gallery");
  if (!templates.length) {
    g.innerHTML =
      '<p class="muted">Tidak ada file .docx di folder templates/. Jalankan lewat web server lokal & letakkan template di sana (atau buat templates/index.json).</p>';
    return;
  }
  g.innerHTML = templates
    .map(
      (f, i) =>
        `<button class="tcard" data-f="${esc(f)}"><div class="thumb v${
          i % 2
        }"><i class="h"></i><i></i><i class="s"></i><i></i><i></i><i class="s"></i><i></i><i></i></div><b>${esc(
          niceName(f)
        )}</b></button>`
    )
    .join("");
  $("#tpl-select").innerHTML = templates
    .map((f) => `<option value="${esc(f)}">${esc(niceName(f))}</option>`)
    .join("");
}

/* ---------- Form ---------- */
const inp = (k, l, v, type, attrs) =>
  `<label>${l}</label>` +
  (type === "t"
    ? `<textarea ${attrs}>${esc(v)}</textarea>`
    : `<input type="text" value="${esc(v)}" ${attrs}>`);
function renderForm() {
  let h = `<div class="group"><div class="gh">Data Pribadi</div>${BASIC.map(
    ([k, l]) => inp(k, l, data[k], "", `data-k="${k}"`)
  ).join("")}${inp(
    "profil_singkat",
    "Profil Singkat",
    data.profil_singkat,
    "t",
    'data-k="profil_singkat"'
  )}</div>`;
  for (const [s, cfg] of Object.entries(LISTS)) {
    h +=
      `<div class="group"><div class="gh">${cfg.t}</div>` +
      data[s]
        .map(
          (it, i) =>
            `<div class="item">${cfg.f
              .map(([k, l, t]) =>
                inp(k, l, it[k], t, `data-s="${s}" data-i="${i}" data-k="${k}"`)
              )
              .join(
                ""
              )}<button class="btn danger sm" data-del="${s}" data-i="${i}" style="margin-top:8px">Hapus</button></div>`
        )
        .join("") +
      `<button class="btn sm" data-add="${s}" style="margin-top:12px">+ Tambah</button></div>`;
  }
  $("#form").innerHTML = h;
  applyTab();
  renderPreview();
}
const lines = (t) =>
  String(t || "")
    .split("\n")
    .filter((x) => x.trim())
    .map((x) => `<li>${esc(x.replace(/^[•\-\s]+/, ""))}</li>`)
    .join("");
function renderPreviewHTML() {
  const d = data,
    L = (a, fn) => a.map(fn).join("");
  const row = (l, r) =>
    `<div class="row"><span>${l}</span><span>${r}</span></div>`;
  const contact = [
    d.telepon,
    d.email,
    d.linkedin,
    d.instagram,
    d.facebook,
    d.alamat,
  ]
    .filter(Boolean)
    .map(esc)
    .join(" | ");
  $("#preview").innerHTML = `<div class="ct"><h1>${
    esc(d.nama_lengkap) || "Nama Lengkap"
  }</h1>${contact}</div>
  ${d.profil_singkat ? `<h2>Profile</h2>${esc(d.profil_singkat)}` : ""}
  ${
    d.pendidikan.length
      ? `<h2>Education</h2>` +
        L(
          d.pendidikan,
          (e) =>
            row(
              `${esc(e.nama_institusi)} – ${esc(e.lokasi_institusi)}`,
              `(${esc(e.periode_pendidikan)})`
            ) +
            `<div>${esc(e.gelar)}, ${esc(e.jurusan)} | GPA: ${esc(
              e.ipk
            )}</div><ul>${lines(e.deskripsi_pendidikan)}</ul>`
        )
      : ""
  }
  ${
    d.pengalaman.length
      ? `<h2>Experience</h2>` +
        L(
          d.pengalaman,
          (e) =>
            row(
              `${esc(e.posisi_kerja)} – ${esc(e.nama_perusahaan)}`,
              `(${esc(e.periode_kerja)})`
            ) +
            `<div><i>${esc(e.tipe_pekerjaan)} | ${esc(e.lokasi_kerja)} – ${esc(
              e.sistem_kerja
            )}</i></div><ul>${lines(e.deskripsi_pekerjaan)}</ul>`
        )
      : ""
  }
  ${
    d.organisasi.length
      ? `<h2>Organizations</h2>` +
        L(
          d.organisasi,
          (e) =>
            row(
              `${esc(e.nama_organisasi)} – ${esc(e.peran)}`,
              `(${esc(e.periode_organisasi)})`
            ) + `<ul>${lines(e.deskripsi_organisasi)}</ul>`
        )
      : ""
  }
  ${
    d.proyek.length
      ? `<h2>Projects</h2>` +
        L(
          d.proyek,
          (e) =>
            row(
              `${esc(e.nama_proyek)} – ${esc(e.pemberi_proyek)}`,
              `(${esc(e.periode_proyek)})`
            ) +
            `<div><i>Project Type: ${esc(e.tipe_proyek)} | ${esc(
              e.lokasi_proyek
            )}</i></div><ul>${lines(e.deskripsi_proyek)}</ul>`
        )
      : ""
  }
  ${
    d.pelatihan.length
      ? `<h2>Training &amp; Courses</h2><ul>${L(
          d.pelatihan,
          (e) =>
            `<li>${esc(e.nama_pelatihan)} – ${esc(e.penyelenggara)}, ${esc(
              e.tahun_pelatihan
            )}</li>`
        )}</ul>`
      : ""
  }
  ${
    d.skills.length
      ? `<h2>Skills</h2><ul>${L(
          d.skills,
          (e) => `<li>${esc(e.nama_skill)} : ${esc(e.jenis_skill)}</li>`
        )}</ul>`
      : ""
  }
  <p class="muted" style="font-size:10px;margin-top:16px">* Preview pendekatan. Layout final mengikuti template .docx.</p>`;
}
$("#form").addEventListener("input", (e) => {
  const t = e.target,
    k = t.dataset.k;
  if (!k) return;
  t.dataset.s
    ? (data[t.dataset.s][+t.dataset.i][k] = t.value)
    : (data[k] = t.value);
  renderPreview();
});
$("#form").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.add) {
    data[b.dataset.add].push(blankItem(b.dataset.add));
    renderForm();
  }
  if (b.dataset.del) {
    data[b.dataset.del].splice(+b.dataset.i, 1);
    renderForm();
  }
});

/* ---------- Navigasi ---------- */
function show(p) {
  document
    .querySelectorAll(".page")
    .forEach((x) => x.classList.toggle("active", x.id === "page-" + p));
  document.body.classList.toggle("in-editor", p === "editor");
  scrollTo(0, 0);
}
function openEditor(f) {
  current = f;
  $("#tpl-select").value = f;
  renderForm();
  show("editor");
}
$("#gallery").addEventListener("click", (e) => {
  const c = e.target.closest(".tcard");
  if (c) openEditor(c.dataset.f);
});
$("#tpl-select").addEventListener("change", (e) => {
  current = e.target.value;
  renderPreview();
});
$("#btn-back").onclick = () => show("dash");
$("#seg").addEventListener("click", (e) => {
  const v = e.target.dataset.v;
  if (!v) return;
  $("#editor").className = "editor show-" + v;
  document
    .querySelectorAll("#seg button")
    .forEach((b) => b.classList.toggle("on", b.dataset.v === v));
});

/* ---------- Toast, Modal ---------- */
function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3500);
}
$("#btn-clear").onclick = () => $("#modal").classList.add("show");
$("#modal-cancel").onclick = () => $("#modal").classList.remove("show");
$("#modal-ok").onclick = () => {
  data = blank();
  renderForm();
  $("#modal").classList.remove("show");
  toast("Data dihapus");
};

/* ---------- Demo, Ekspor, Impor ---------- */
$("#btn-demo").onclick = () => {
  data = demo();
  renderForm();
  toast("Demo data dimuat");
};
$("#btn-export").onclick = () => {
  saveAs(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    "cv-data.json"
  );
};
$("#btn-import").onclick = () => $("#file-import").click();
$("#file-import").onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      data = Object.assign(blank(), JSON.parse(r.result));
      renderForm();
      toast("Impor berhasil");
    } catch {
      toast("File JSON tidak valid");
    }
  };
  r.readAsText(f);
  e.target.value = "";
};

/* ---------- Bullet per baris ---------- */
const DESC = [
  "deskripsi_pendidikan",
  "deskripsi_pekerjaan",
  "deskripsi_organisasi",
  "deskripsi_proyek",
];
function buildPayload(zip) {
  // Teks template tanpa tag XML, untuk mendeteksi apakah deskripsi dibuat sebagai loop {#deskripsi_xxx}
  const txt = zip
    .file("word/document.xml")
    .asText()
    .replace(/<[^>]+>/g, "");
  const split = (t) =>
    String(t || "")
      .split("\n")
      .map((x) => x.replace(/^[•\-\s]+/, "").trim())
      .filter(Boolean);
  const p = JSON.parse(JSON.stringify(data));
  Object.keys(LISTS).forEach((s) =>
    p[s].forEach((it) =>
      DESC.forEach((k) => {
        if (!(k in it)) return;
        const lines = split(it[k]);
        // Mode A (template pakai loop): kirim array. Mode B (template lama): gabung dengan bullet manual.
        it[k] = txt.includes("{#" + k + "}") ? lines : lines.join("\n•      ");
      })
    )
  );
  p.has_organisasi = p.organisasi.length > 0; // heading ORGANIZATIONS muncul sekali, dan hilang jika kosong
  return p;
}

// Hyperlink di template berisi placeholder (mailto:%7bemail%7d dst) yang tidak diisi docxtemplater; isi manual di file relasi.
function fixLinks(zip) {
  const f = "word/_rels/document.xml.rels",
    z = zip.file(f);
  if (!z) return;
  const url = (v, pre) => {
    v = String(v || "").trim();
    if (!v) return pre;
    if (/^https?:\/\//i.test(v)) return v;
    if (/[\/.]/.test(v)) return "https://" + v.replace(/^\/+/, "");
    return pre + v.replace(/^@/, "");
  };
  const x = (t) => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  let r = z.asText();
  const sub = (a, b) => {
    r = r.split(a).join(x(b));
  };
  sub("mailto:%7bemail%7d", "mailto:" + data.email.trim());
  sub(
    "https://linkedin.com/in/%7blinkedin%7d",
    url(data.linkedin, "https://linkedin.com/in/")
  );
  sub(
    "https://instagram.com/%7binstagram%7d",
    url(data.instagram, "https://instagram.com/")
  );
  sub(
    "https://facebook.com/%7bfacebook%7d",
    url(data.facebook, "https://facebook.com/")
  );
  zip.file(f, r);
}

/* ---------- Generate DOCX (dipakai preview & download) ---------- */
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const tplCache = {};
async function loadTemplate(name) {
  if (!tplCache[name]) {
    const res = await fetch("templates/" + encodeURIComponent(name));
    if (!res.ok)
      throw new Error("Template tidak ditemukan (" + res.status + ")");
    tplCache[name] = await res.arrayBuffer();
  }
  return tplCache[name];
}
async function buildDocx(name) {
  const zip = new PizZip(await loadTemplate(name));
  const payload = buildPayload(zip);
  const doc = new window.docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(payload);
  fixLinks(doc.getZip());
  return doc.getZip().generate({ type: "blob", mimeType: DOCX_MIME });
}
const errMsg = (err) => {
  const d = err.properties && err.properties.errors;
  return d
    ? "Error template: " + d.map((x) => x.properties.explanation).join("; ")
    : err.message;
};

/* ---------- Download DOCX ---------- */
$("#btn-docx").onclick = async () => {
  try {
    const out = await buildDocx(current);
    saveAs(
      out,
      `CV_${(data.nama_lengkap || "Tanpa_Nama")
        .trim()
        .replace(/\s+/g, "_")}.docx`
    );
  } catch (err) {
    toast(errMsg(err));
  }
};

/* ---------- Preview asli dari template Word (docx-preview) ---------- */
let prevTimer,
  prevToken = 0;
function fitPreview() {
  const box = $("#preview"),
    wrap = box.querySelector(".docx-wrapper"),
    sec = box.querySelector("section.docx");
  if (!wrap || !sec || !box.clientWidth) return;
  wrap.style.zoom = 1;
  wrap.style.zoom = Math.min(1, box.clientWidth / (sec.offsetWidth + 2));
}
new ResizeObserver(fitPreview).observe($("#preview"));
function renderPreview() {
  clearTimeout(prevTimer);
  prevTimer = setTimeout(async () => {
    if (!current) return;
    const token = ++prevToken,
      box = $("#preview"),
      st = $("#prev-status");
    const fallback = (msg) => {
      box.classList.remove("docx-mode");
      renderPreviewHTML();
      st.textContent = msg;
    };
    if (!window.docx)
      return fallback("Preview cadangan (docx-preview gagal dimuat)");
    try {
      st.textContent = "Memperbarui preview…";
      const blob = await buildDocx(current);
      const tmp = document.createElement("div");
      await window.docx.renderAsync(blob, tmp, null, {
        className: "docx",
        inWrapper: true,
        breakPages: true,
        useBase64URL: true,
      });
      if (token !== prevToken) return; // ada render yang lebih baru
      box.classList.add("docx-mode");
      box.replaceChildren(...tmp.childNodes);
      fitPreview();
      st.textContent = "Preview mengikuti template: " + niceName(current);
    } catch (err) {
      if (token === prevToken) fallback("Preview cadangan – " + errMsg(err));
    }
  }, 350);
}

/* ---------- Demo data ---------- */
function demo() {
  return Object.assign(blank(), {
    nama_lengkap: "Rizky Pratama Wijaya",
    telepon: "+62 812-3456-7890",
    email: "rizky.wijaya@email.com",
    linkedin: "linkedin.com/in/rizkywijaya",
    instagram: "",
    facebook: "",
    alamat: "Depok, Jawa Barat",
    profil_singkat:
      "IT Support Engineer dengan 6 tahun pengalaman mengelola helpdesk, infrastruktur jaringan, dan aset IT di lingkungan enterprise. Terbiasa menerapkan ITIL v4 dan ISO 27001.",
    pendidikan: [
      {
        nama_institusi: "Universitas Indonesia",
        lokasi_institusi: "Depok",
        periode_pendidikan: "2014 – 2018",
        gelar: "S1",
        jurusan: "Teknik Informatika",
        ipk: "3.58",
        deskripsi_pendidikan:
          "Skripsi tentang sistem monitoring jaringan berbasis SNMP.",
      },
      {
        nama_institusi: "Politeknik Negeri Jakarta",
        lokasi_institusi: "Depok",
        periode_pendidikan: "2012 – 2014",
        gelar: "D2",
        jurusan: "Teknik Komputer",
        ipk: "3.62",
        deskripsi_pendidikan: "Asisten laboratorium jaringan komputer.",
      },
      {
        nama_institusi: "SMAN 2 Depok",
        lokasi_institusi: "Depok",
        periode_pendidikan: "2009 – 2012",
        gelar: "SMA",
        jurusan: "IPA",
        ipk: "8.4",
        deskripsi_pendidikan: "Juara 2 olimpiade komputer tingkat kota.",
      },
    ],
    pengalaman: [
      {
        posisi_kerja: "Senior IT Support Engineer",
        nama_perusahaan: "PT Nusantara Manufaktur",
        periode_kerja: "Jan 2022 – Sekarang",
        tipe_pekerjaan: "Full-time",
        lokasi_kerja: "Bekasi",
        sistem_kerja: "Hybrid",
        deskripsi_pekerjaan:
          "Menangani 1.200+ tiket/tahun dengan SLA 96%.\nMengelola 850 endpoint melalui Intune dan Active Directory.\nMenurunkan biaya lisensi software 18% lewat audit SAM.",
      },
      {
        posisi_kerja: "IT Support Specialist",
        nama_perusahaan: "PT Bank Sejahtera",
        periode_kerja: "Jun 2019 – Des 2021",
        tipe_pekerjaan: "Full-time",
        lokasi_kerja: "Jakarta",
        sistem_kerja: "On-site",
        deskripsi_pekerjaan:
          "Mengelola inventori 2.000+ aset IT dan siklus hidupnya.\nMenyusun SOP deployment laptop yang memangkas waktu setup 40%.",
      },
      {
        posisi_kerja: "IT Helpdesk Officer",
        nama_perusahaan: "CV Digital Solusi",
        periode_kerja: "Sep 2018 – Mei 2019",
        tipe_pekerjaan: "Kontrak",
        lokasi_kerja: "Depok",
        sistem_kerja: "On-site",
        deskripsi_pekerjaan:
          "Menyelesaikan insiden Level 1–2 untuk 300 pengguna.\nMembuat knowledge base untuk 60+ masalah umum.",
      },
    ],
    organisasi: [
      {
        nama_organisasi: "Himpunan Mahasiswa Informatika UI",
        peran: "Ketua Divisi Teknologi",
        periode_organisasi: "2016 – 2017",
        deskripsi_organisasi:
          "Memimpin 15 anggota membangun portal internal himpunan.",
      },
      {
        nama_organisasi: "Komunitas Linux Depok",
        peran: "Koordinator Acara",
        periode_organisasi: "2017 – 2019",
        deskripsi_organisasi:
          "Menyelenggarakan 8 workshop dengan total 400 peserta.",
      },
      {
        nama_organisasi: "ISACA Indonesia Chapter",
        peran: "Anggota",
        periode_organisasi: "2021 – Sekarang",
        deskripsi_organisasi:
          "Aktif dalam forum tata kelola dan keamanan informasi.",
      },
    ],
    proyek: [
      {
        nama_proyek: "Migrasi Microsoft 365",
        pemberi_proyek: "PT Nusantara Manufaktur",
        periode_proyek: "2023",
        tipe_proyek: "Migrasi Cloud",
        lokasi_proyek: "Bekasi",
        deskripsi_proyek: "Memigrasikan 900 mailbox tanpa downtime signifikan.",
      },
      {
        nama_proyek: "Implementasi CMDB & ITAM",
        pemberi_proyek: "PT Bank Sejahtera",
        periode_proyek: "2021",
        tipe_proyek: "Asset Management",
        lokasi_proyek: "Jakarta",
        deskripsi_proyek:
          "Membangun CMDB dengan akurasi aset 98% setelah audit.",
      },
      {
        nama_proyek: "Refresh Jaringan WiFi",
        pemberi_proyek: "Kampus Mitra",
        periode_proyek: "2020",
        tipe_proyek: "Infrastruktur",
        lokasi_proyek: "Depok",
        deskripsi_proyek: "Menerapkan WiFi terkontrol untuk 40 titik akses.",
      },
    ],
    pelatihan: [
      {
        nama_pelatihan: "ITIL 4 Foundation",
        penyelenggara: "PeopleCert",
        tahun_pelatihan: "2021",
      },
      {
        nama_pelatihan: "ISO/IEC 27001 Lead Implementer",
        penyelenggara: "BSI",
        tahun_pelatihan: "2023",
      },
      {
        nama_pelatihan: "Microsoft 365 Administrator (MS-102)",
        penyelenggara: "Microsoft",
        tahun_pelatihan: "2022",
      },
    ],
    skills: [
      {
        nama_skill: "Active Directory & Group Policy",
        jenis_skill: "Advanced",
      },
      { nama_skill: "IT Asset Management", jenis_skill: "Advanced" },
      { nama_skill: "Network Troubleshooting", jenis_skill: "Intermediate" },
    ],
  });
}

/* ---------- UI baru: sidebar section, progres, micro-interaction ---------- */
// [label, indeks group di #form, ikon, wajib]; -1 = panel info (Bahasa memakai data Skills)
const STEPS = [
  ["Data Diri", 0, "u", 1],
  ["Pendidikan", 1, "e", 1],
  ["Pengalaman", 2, "w", 1],
  ["Keahlian", 6, "s", 1],
  ["Organisasi", 3, "o", 0],
  ["Sertifikasi", 5, "c", 0],
  ["Bahasa", -1, "g", 0],
  ["Tambahan", 4, "p", 0],
];
const IC = {
  u: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  e: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  w: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3"/>',
  s: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  o: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5 7-5s7 1.5 7 5M17 5a3.5 3.5 0 010 6M22 20c0-2.5-1.5-4-4-4.6"/>',
  c: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/>',
  g: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  p: '<path d="M12 5v14M5 12h14"/>',
};
// status selesai per section (hanya membaca data, tidak mengubahnya)
const DONE = [
  () => !!(data.nama_lengkap.trim() && data.telepon.trim() && data.email.trim()),
  () => data.pendidikan.length > 0,
  () => data.pengalaman.length > 0,
  () => data.skills.length > 0,
  () => data.organisasi.length > 0,
  () => data.pelatihan.length > 0,
  () => data.skills.some((s) => /bahasa|language/i.test(s.nama_skill)),
  () => data.proyek.length > 0,
];
let step = 0;
function buildSteps() {
  $("#steps").innerHTML =
    `<div class="prog"><div class="pt"><b>Progres CV</b><span id="pct">0%</span></div><div class="bar"><i id="bar"></i></div><small id="pinfo"></small></div><div class="stepl"><i class="ind"></i>` +
    STEPS.map(
      ([l, , ic, rq], i) =>
        `<button data-step="${i}"><svg viewBox="0 0 24 24">${IC[ic]}</svg><span>${l}</span><em>${rq ? "" : "Opsional"}</em><u>✓</u></button>`
    ).join("") +
    `</div>`;
}
function moveInd() {
  const on = $("#steps .on"),
    ind = $("#steps .ind");
  if (!on || !ind || !on.offsetWidth) return;
  ind.style.width = on.offsetWidth + "px";
  ind.style.height = on.offsetHeight + "px";
  ind.style.transform = `translate(${on.offsetLeft}px,${on.offsetTop}px)`;
}
function updateProgress() {
  if (!$("#bar")) return;
  document.querySelectorAll("#steps .stepl button").forEach((b, i) =>
    b.classList.toggle("done", DONE[i]())
  );
  const rq = STEPS.filter((s) => s[3]),
    n = rq.filter((s) => DONE[STEPS.indexOf(s)]()).length,
    pc = Math.round((n / rq.length) * 100);
  $("#bar").style.width = pc + "%";
  $("#pct").textContent = pc + "%";
  $("#pinfo").textContent = `${n}/${rq.length} bagian wajib selesai`;
}
function applyTab() {
  if (!$("#steps .ind")) buildSteps();
  document
    .querySelectorAll("#steps .stepl button")
    .forEach((b, i) => b.classList.toggle("on", i === step));
  document
    .querySelectorAll("#form .group")
    .forEach((g, i) => (g.hidden = i !== STEPS[step][1]));
  $("#lang-note").hidden = STEPS[step][1] !== -1;
  $("#btn-prev-step").disabled = step === 0;
  $("#btn-next-step").textContent =
    step === STEPS.length - 1 ? "Simpan ✓" : "Simpan & Lanjut →";
  const on = $("#steps .on");
  if (on) on.scrollIntoView({ block: "nearest", inline: "center" });
  moveInd();
  updateProgress();
}
const goStep = (i) => {
  step = Math.max(0, Math.min(STEPS.length - 1, i));
  applyTab();
  if (innerWidth < 900) scrollTo(0, 0);
};
$("#btn-prev-step").onclick = () => goStep(step - 1);
$("#btn-next-step").onclick = () => {
  const b = $("#btn-next-step"),
    t = b.textContent;
  b.classList.add("ok");
  b.textContent = "Tersimpan ✓";
  updateProgress();
  setTimeout(() => {
    b.classList.remove("ok");
    if (step < STEPS.length - 1) goStep(step + 1);
    else {
      b.textContent = t;
      toast("Semua perubahan tersimpan di preview");
    }
  }, 550);
};
$("#form").addEventListener("input", updateProgress);
$("#form").addEventListener("click", () => setTimeout(updateProgress, 0));
new ResizeObserver(moveInd).observe($("#steps"));
// skeleton pada preview saat sedang diperbarui
new MutationObserver(() =>
  $("#preview").classList.toggle(
    "busy",
    $("#prev-status").textContent.startsWith("Memperbarui")
  )
).observe($("#prev-status"), { childList: true, characterData: true, subtree: true });
$("#btn-pdf").onclick = () => {
  if (!$("#preview .docx-wrapper")) return toast("Preview belum siap, coba sesaat lagi");
  print(); // pilih "Save as PDF" pada dialog cetak
};
document.addEventListener("click", (e) => {
  const s = e.target.closest("[data-step]");
  if (s) goStep(+s.dataset.step);
  const g = e.target.closest("[data-go]");
  if (g) {
    e.preventDefault();
    show(g.dataset.go);
  }
  const c = e.target.closest("[data-copy]");
  if (c) {
    navigator.clipboard
      .writeText(c.parentElement.querySelector("pre").textContent)
      .then(() => toast("Prompt disalin"));
  }
});

/* ---------- Halaman Tips & Tricks ---------- */
const TIPS = [
  ["CV ATS Basics", ["Satu kolom, tanpa tabel, gambar, atau ikon — ATS sering salah membaca.", "Font standar (Calibri/Arial) ukuran 10–12 pt; heading jelas: Profile, Education, Experience, Skills.", "Gunakan kata kunci dari lowongan secara natural, jangan disisipkan tersembunyi.", "Simpan sebagai .docx atau PDF teks; hindari PDF hasil scan."]],
  ["Tips Data Diri", ["Cukup nama, telepon, email profesional, kota, dan LinkedIn.", "Tidak perlu foto, usia, status pernikahan, atau alamat lengkap.", "Pastikan email berformat nama sendiri, bukan nama panggilan."]],
  ["Tips Pendidikan", ["Urutkan dari yang terbaru; tulis institusi, jurusan, gelar, dan periode.", "Cantumkan IPK jika ≥ 3.00.", "Fresh graduate: tambahkan skripsi, proyek, atau prestasi di Deskripsi."]],
  ["Tips Pengalaman Kerja", ["Satu baris = satu pencapaian, diawali kata kerja aksi.", "Tambahkan angka: jumlah, persen, waktu, atau biaya.", "Rumus: Aksi + Konteks + Hasil terukur.", "3–5 poin per posisi sudah cukup."]],
  ["Tips Keahlian", ["Pisahkan hard skill dan soft skill; utamakan yang diminta lowongan.", "Gunakan nama resmi tool (mis. Microsoft Excel, bukan “Office”).", "Bahasa asing: isi di Keahlian, mis. “Bahasa Inggris : Fluent”."]],
  ["Tips Summary / About Me", ["2–4 kalimat: profesi, lama pengalaman, keahlian utama, nilai yang dibawa.", "Sesuaikan dengan posisi yang dilamar.", "Hindari klise seperti “pekerja keras dan team player” tanpa bukti."]],
];
const PROMPTS = [
  ["Generate Summary", "Kamu adalah HR recruiter berpengalaman. Buatkan ringkasan profil CV 3 kalimat (bahasa Indonesia, ramah ATS) untuk posisi [POSISI]. Data saya: pengalaman [X tahun] di [BIDANG], keahlian utama [SKILL], pencapaian terbesar [ANGKA/HASIL]."],
  ["Improve Experience", "Perbaiki poin pengalaman kerja berikut agar diawali kata kerja aksi, ringkas, dan memuat hasil terukur. Jangan mengarang angka; beri tanda [ISI ANGKA] bila datanya kurang. Format: satu poin per baris.\n\n[TEMPEL DESKRIPSI PEKERJAAN]"],
  ["Generate Skills", "Dari deskripsi lowongan berikut, daftar 10–15 hard skill dan tool yang paling sering muncul. Lalu cocokkan dengan daftar keahlian saya dan tunjukkan mana yang belum ada.\n\nLowongan: [TEMPEL]\nKeahlian saya: [TEMPEL]"],
  ["Review CV", "Review CV saya untuk posisi [POSISI] sebagai spesialis ATS. Nilai kecocokan kata kunci, kejelasan pencapaian, dan struktur. Beri 5 perbaikan paling berdampak, urut prioritas.\n\nCV: [TEMPEL]\nLowongan: [TEMPEL]"],
];
const DD = [
  ["Do", ["Tailor CV per lowongan", "Pakai angka & hasil", "Cek ejaan dan konsistensi format tanggal", "Maksimal 1–2 halaman"]],
  ["Don't", ["Tabel, kolom ganda, atau grafik skill", "Foto dan data pribadi berlebihan", "Menyalin mentah hasil AI tanpa dicek", "Kata kunci fiktif yang tidak Anda kuasai"]],
];
const TFAQ = [
  ["Apakah aman memakai AI untuk CV?", "Aman selama Anda memeriksa hasilnya. Jangan masukkan nomor KTP atau data sensitif ke prompt."],
  ["Berapa panjang CV ideal?", "Satu halaman untuk fresh graduate, maksimal dua halaman untuk yang berpengalaman."],
];
$("#tips-body").innerHTML =
  TIPS.map(([t, l]) => `<section class="group"><div class="gh">${t}</div><ul>${l.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>`).join("") +
  `<h2 class="sech">AI Prompting</h2><p class="muted">Ganti teks dalam [KURUNG] dengan data Anda.</p><div class="grid">` +
  PROMPTS.map(([t, p]) => `<section class="group"><div class="gh">${t}</div><pre>${esc(p)}</pre><button class="btn sm" data-copy>Salin Prompt</button></section>`).join("") +
  `</div><h2 class="sech">Do &amp; Don't</h2><div class="grid">` +
  DD.map(([t, l]) => `<section class="group dd ${t === "Do" ? "yes" : "no"}"><div class="gh">${t}</div><ul>${l.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>`).join("") +
  `</div><h2 class="sech">FAQ</h2>` +
  TFAQ.map(([q, a]) => `<details class="group"><summary>${q}</summary><p class="muted">${a}</p></details>`).join("");

initTemplates();
