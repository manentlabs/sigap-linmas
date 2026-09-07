// frontend/src/data/layananConfig.js
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import ChildCareOutlinedIcon from "@mui/icons-material/ChildCareOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

// `jenis` harus SAMA PERSIS dengan ENUM kolom `jenis` di tabel layanan_publik
// (lihat backend/sql/layanan_publik.sql) — dipakai sebagai value saat submit.
const LAYANAN_LIST = [
  {
    key: "bencana",
    jenis: "Laporan Bencana",
    title: "Laporan Bencana",
    desc: "Laporkan kejadian bencana alam atau non-alam di sekitar Anda untuk penanganan cepat oleh petugas Linmas.",
    icon: ReportProblemOutlinedIcon,
    color: "#EF5B5B",
    bg: "rgba(239,91,91,0.10)",
  },
  {
    key: "tantribum",
    jenis: "Pengaduan Tantribumlinmas",
    title: "Pengaduan Tantribumlinmas",
    desc: "Sampaikan gangguan ketentraman dan ketertiban umum di lingkungan tempat tinggal Anda.",
    icon: GavelOutlinedIcon,
    color: "#F2A93B",
    bg: "rgba(242,169,59,0.12)",
  },
  {
    key: "posyandu",
    jenis: "Posyandu",
    title: "Posyandu",
    desc: "Sampaikan pertanyaan, permintaan informasi, atau kendala terkait kegiatan Posyandu di wilayah Anda.",
    icon: ChildCareOutlinedIcon,
    color: "#1B5E20",
    bg: "rgba(27,94,32,0.10)",
  },
  {
    key: "sampah",
    jenis: "Pengaduan Penanggulangan Sampah",
    title: "Pengaduan Sampah",
    desc: "Laporkan tumpukan sampah liar atau kendala pengangkutan sampah di lingkungan Anda.",
    icon: DeleteOutlineOutlinedIcon,
    color: "#0EA5A5",
    bg: "rgba(14,165,165,0.10)",
  },
];

export default LAYANAN_LIST;