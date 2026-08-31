import React, { useEffect, useMemo, useState, useCallback } from "react";
import Swal from "sweetalert2";
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  CircularProgress,
  Snackbar,
  Alert,
  TablePagination,
  Switch,
  FormControlLabel,
  InputAdornment,
} from "@mui/material";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUser,
  FiSearch,
  FiEye,
  FiEyeOff,
  FiMail,
  FiMapPin,
  FiCalendar,
  FiHash,
  FiToggleLeft,
  FiToggleRight,
} from "react-icons/fi";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// ─── Palet ────────────────────────────────────────────────────────────────
const C = {
  bg: "#F7F9FC",
  panel: "#FFFFFF",
  border: "#E4E9F2",
  text: "#131C2B",
  textDim: "#64748B",
  textFaint: "#94A3B8",
  amber: "#F2A93B",
  amberBg: "rgba(242,169,59,0.14)",
  red: "#E5484D",
  redBg: "rgba(229,72,77,0.10)",
  teal: "#0EA5A5",
  tealBg: "rgba(14,165,165,0.10)",
  indigo: "#3B82F6",
  indigoBg: "rgba(59,130,246,0.10)",
  slate: "#64748B",
  slateBg: "rgba(100,116,139,0.10)",
};

// Pilihan role yang tersedia
const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "kepala_satgas", label: "Kepala Satgas" },
  { value: "operator_kecamatan", label: "Operator Kecamatan" },
  { value: "non_p3k", label: "Non P3K" },
];

// Role yang wajib memiliki kecamatan
const ROLES_WITH_KECAMATAN = ["operator_kecamatan", "non_p3k"];

const EMPTY_FORM = {
  id: null,
  nama: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "operator_kecamatan",
  kecamatan_id: "",
  is_active: true,
};

export default function UserPage() {
  // ─── Auth ────────────────────────────────────────────────────────────────
  const { user } = useAuth();
  const role = user?.role;

  // ─── Cek akses: hanya admin yang boleh mengelola user ────────────────
  if (role !== "admin") {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h5" sx={{ color: C.red, fontWeight: 700 }}>
          Akses Ditolak
        </Typography>
        <Typography sx={{ color: C.textDim, mt: 1 }}>
          Halaman ini hanya dapat diakses oleh administrator.
        </Typography>
      </Box>
    );
  }

  // ─── State ────────────────────────────────────────────────────────────────
  const [list, setList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter
  const [filterRole, setFilterRole] = useState("Semua");
  const [filterKecamatan, setFilterKecamatan] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalRows, setTotalRows] = useState(0);

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Detail view
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState(null);

  // Toast
  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });
  const showToast = (msg, severity = "success") =>
    setToast({ open: true, msg, severity });

  // ─── Data fetching ────────────────────────────────────────────────────────
  const fetchKecamatan = useCallback(async () => {
    try {
      const res = await api.get("/kecamatan");
      setKecamatanList(res.data.data || []);
    } catch {
      showToast("Gagal memuat daftar kecamatan", "error");
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setQDebounced(q.trim()), 450);
    return () => clearTimeout(timer);
  }, [q]);

  // Reset halaman saat filter berubah
  useEffect(() => {
    setPage(0);
  }, [filterRole, filterKecamatan, filterStatus, qDebounced]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (filterRole !== "Semua") params.role = filterRole;
      if (filterKecamatan !== "Semua") params.kecamatan_id = filterKecamatan;
      if (filterStatus !== "Semua")
        params.is_active = filterStatus === "Aktif" ? 1 : 0;
      if (qDebounced) params.q = qDebounced;

      const res = await api.get("/user", { params }); // ✅ endpoint sesuai route
      setList(res.data.data || []);
      setTotalRows(res.data.pagination?.total ?? 0);
    } catch {
      showToast("Gagal memuat data user", "error");
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterKecamatan, filterStatus, qDebounced, page, rowsPerPage]);

  useEffect(() => {
    fetchKecamatan();
  }, [fetchKecamatan]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ─── Form handlers ──────────────────────────────────────────────────────
  const openTambah = () => {
    setForm({ ...EMPTY_FORM });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setForm({
      id: item.id,
      nama: item.nama,
      email: item.email,
      password: "",
      confirmPassword: "",
      role: item.role,
      kecamatan_id: item.kecamatan_id || "",
      is_active: item.is_active === 1,
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
  };

  const openView = (item) => {
    setViewData(item);
    setViewOpen(true);
  };
  const closeView = () => {
    setViewOpen(false);
    setViewData(null);
  };

  const handleSubmit = async () => {
    if (!form.nama.trim() || !form.email.trim()) {
      showToast("Nama dan Email wajib diisi", "error");
      return;
    }
    if (!form.id && !form.password.trim()) {
      showToast("Password wajib diisi untuk user baru", "error");
      return;
    }
    if (form.password.trim() && form.password !== form.confirmPassword) {
      showToast("Konfirmasi password tidak cocok", "error");
      return;
    }
    if (ROLES_WITH_KECAMATAN.includes(form.role) && !form.kecamatan_id) {
      showToast("Pilih kecamatan untuk role ini", "error");
      return;
    }

    const payload = {
      nama: form.nama.trim(),
      email: form.email.trim(),
      role: form.role,
      kecamatan_id: ROLES_WITH_KECAMATAN.includes(form.role)
        ? form.kecamatan_id
        : null,
      is_active: form.is_active ? 1 : 0,
    };
    if (form.password.trim()) payload.password = form.password.trim();

    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/user/${form.id}`, payload);
        showToast("User berhasil diperbarui");
      } else {
        await api.post("/user", payload);
        showToast("User berhasil ditambahkan");
      }
      setFormOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal menyimpan user", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus user ini?",
      text: `"${item.nama}" (${item.email}) akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: C.red,
      cancelButtonColor: "#94A3B8",
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/user/${item.id}`);
      showToast("User berhasil dihapus");
      if (list.length === 1 && page > 0) {
        setPage((p) => p - 1);
      } else {
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal menghapus user", "error");
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.is_active === 1 ? 0 : 1;
    try {
      await api.patch(`/user/${item.id}/status`, { is_active: newStatus });
      showToast(`Status user diubah menjadi ${newStatus ? "Aktif" : "Nonaktif"}`);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal mengubah status", "error");
    }
  };

  const kecamatanNama = useMemo(() => {
    const map = {};
    kecamatanList.forEach((k) => (map[k.id] = k.nama));
    return map;
  }, [kecamatanList]);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Helper untuk label role
  const getRoleLabel = (roleValue) => {
    const found = ROLES.find((r) => r.value === roleValue);
    return found ? found.label : roleValue;
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* ─── Header ─── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 2.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 11,
              letterSpacing: 1.2,
              color: C.amber,
              fontWeight: 700,
              textTransform: "uppercase",
              mb: 0.3,
            }}
          >
            Manajemen Akses
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: C.text }}>
            Data User
          </Typography>
        </Box>
        <Button
          onClick={openTambah}
          variant="contained"
          startIcon={<FiPlus size={15} />}
          sx={primaryBtnSx}
        >
          Tambah User
        </Button>
      </Box>

      {/* ─── Filter Bar ─── */}
      <Box
        sx={{
          display: "flex",
          gap: 1.2,
          mb: 2.5,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Role</InputLabel>
          <Select
            label="Role"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <MenuItem value="Semua">Semua</MenuItem>
            {ROLES.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Kecamatan</InputLabel>
          <Select
            label="Kecamatan"
            value={filterKecamatan}
            onChange={(e) => setFilterKecamatan(e.target.value)}
          >
            <MenuItem value="Semua">Semua</MenuItem>
            {kecamatanList.map((k) => (
              <MenuItem key={k.id} value={k.id}>
                {k.nama}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="Semua">Semua</MenuItem>
            <MenuItem value="Aktif">Aktif</MenuItem>
            <MenuItem value="Nonaktif">Nonaktif</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder="Cari nama atau email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <FiSearch size={15} color={C.textFaint} style={{ marginRight: 8 }} />
              ),
            },
          }}
          sx={{ minWidth: 240 }}
        />

        <Typography sx={{ ml: "auto", fontSize: 12.5, color: C.textFaint }}>
          {totalRows} user ditemukan
        </Typography>
      </Box>

      {/* ─── Tabel ─── */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={28} sx={{ color: C.amber }} />
        </Box>
      ) : (
        <>
          <TabelUser
            list={list}
            kecamatanNama={kecamatanNama}
            getRoleLabel={getRoleLabel}
            onView={openView}
            onEdit={openEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
          />
          <Box
            sx={{
              bgcolor: "#FFFFFF",
              border: `1px solid ${C.border}`,
              borderTop: "none",
              borderRadius: "0 0 14px 14px",
            }}
          >
            <TablePagination
              component="div"
              count={totalRows}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Baris per halaman"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} dari ${count}`
              }
            />
          </Box>
        </>
      )}

      {/* ─── Dialog Form Tambah / Edit ─── */}
      <Dialog open={formOpen} onClose={closeForm} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: C.text }}>
          {form.id ? "Edit User" : "Tambah User Baru"}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
            <TextField
              label="Nama Lengkap"
              value={form.nama}
              onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
              fullWidth
              size="small"
              required
            />

            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
              size="small"
              required
            />

            <TextField
              label={form.id ? "Password (kosongkan jika tidak diubah)" : "Password"}
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              fullWidth
              size="small"
              required={!form.id}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        tabIndex={-1}
                      >
                        {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {(form.password.trim() || !form.id) && (
              <TextField
                label="Konfirmasi Password"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
                fullWidth
                size="small"
                required={!form.id}
                error={
                  form.confirmPassword.length > 0 &&
                  form.password !== form.confirmPassword
                }
                helperText={
                  form.confirmPassword.length > 0 &&
                  form.password !== form.confirmPassword
                    ? "Password tidak cocok"
                    : " "
                }
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          edge="end"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}

            <FormControl size="small" fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    role: e.target.value,
                    kecamatan_id: ROLES_WITH_KECAMATAN.includes(e.target.value)
                      ? f.kecamatan_id
                      : "",
                  }))
                }
              >
                {ROLES.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {ROLES_WITH_KECAMATAN.includes(form.role) && (
              <FormControl size="small" fullWidth>
                <InputLabel>Kecamatan</InputLabel>
                <Select
                  label="Kecamatan"
                  value={form.kecamatan_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, kecamatan_id: e.target.value }))
                  }
                >
                  {kecamatanList.map((k) => (
                    <MenuItem key={k.id} value={k.id}>
                      {k.nama}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                  color="primary"
                />
              }
              label={form.is_active ? "Aktif" : "Nonaktif"}
              sx={{ mt: 0.5 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeForm} sx={{ color: C.textDim, textTransform: "none" }}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={saving}
            sx={primaryBtnSx}
          >
            {saving ? <CircularProgress size={18} sx={{ color: "#1A1200" }} /> : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog Detail ─── */}
      <Dialog open={viewOpen} onClose={closeView} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: C.text }}>Detail User</DialogTitle>
        <DialogContent dividers>
          {viewData && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: C.amberBg }}>
                  <FiUser size={28} color={C.amber} />
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: 17, fontWeight: 700, color: C.text }}>
                    {viewData.nama}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: C.textFaint }}>
                    {viewData.email}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.8, mt: 0.4 }}>
                    <Chip
                      label={getRoleLabel(viewData.role)}
                      size="small"
                      sx={{
                        bgcolor: viewData.role === "admin" ? C.indigoBg : C.amberBg,
                        color: viewData.role === "admin" ? C.indigo : C.amber,
                        fontWeight: 600,
                        fontSize: 10,
                      }}
                    />
                    <Chip
                      label={viewData.is_active === 1 ? "Aktif" : "Nonaktif"}
                      size="small"
                      sx={{
                        bgcolor: viewData.is_active === 1 ? C.tealBg : C.redBg,
                        color: viewData.is_active === 1 ? C.teal : C.red,
                        fontWeight: 600,
                        fontSize: 10,
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <DetailItem icon={<FiMail size={14} />} label="Email" value={viewData.email} />
                <DetailItem
                  icon={<FiHash size={14} />}
                  label="Role"
                  value={getRoleLabel(viewData.role)}
                />
                <DetailItem
                  icon={<FiMapPin size={14} />}
                  label="Kecamatan"
                  value={viewData.kecamatan_nama || "-"}
                />
                <DetailItem
                  icon={<FiCalendar size={14} />}
                  label="Bergabung"
                  value={formatTanggal(viewData.created_at)}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Status Akun
                </Typography>
                <Typography sx={{ fontSize: 13.5, color: C.text, mt: 0.2 }}>
                  {viewData.is_active === 1 ? "Aktif" : "Nonaktif"}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeView} sx={{ color: C.textDim, textTransform: "none" }}>
            Tutup
          </Button>
          <Button
            onClick={() => {
              closeView();
              openEdit(viewData);
            }}
            variant="contained"
            startIcon={<FiEdit2 size={14} />}
            sx={primaryBtnSx}
          >
            Edit User
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Snackbar ─── */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ─── Subkomponen: Tabel User ──────────────────────────────────────────────
function TabelUser({
  list,
  kecamatanNama,
  getRoleLabel,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
}) {
  return (
    <Box
      sx={{
        bgcolor: "#FFFFFF",
        border: `1px solid ${C.border}`,
        borderRadius: "14px 14px 0 0",
        overflow: "hidden",
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            {["User", "Email", "Role", "Kecamatan", "Status", "Aksi"].map((h) => (
              <TableCell
                key={h}
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.textFaint,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map((u) => (
            <TableRow key={u.id} hover>
              <TableCell
                sx={{ borderBottom: `1px solid ${C.border}`, maxWidth: 200 }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: C.amberBg }}>
                    <FiUser size={14} color={C.amber} />
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>
                      {u.nama}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                {u.email}
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                <Chip
                  label={getRoleLabel(u.role)}
                  size="small"
                  sx={{
                    bgcolor: u.role === "admin" ? C.indigoBg : C.amberBg,
                    color: u.role === "admin" ? C.indigo : C.amber,
                    fontWeight: 600,
                    fontSize: 11.5,
                  }}
                />
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                {u.kecamatan_nama || kecamatanNama[u.kecamatan_id] || "-"}
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                <Chip
                  label={u.is_active === 1 ? "Aktif" : "Nonaktif"}
                  size="small"
                  sx={{
                    bgcolor: u.is_active === 1 ? C.tealBg : C.redBg,
                    color: u.is_active === 1 ? C.teal : C.red,
                    fontWeight: 600,
                    fontSize: 11.5,
                  }}
                />
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                <IconButton
                  size="small"
                  onClick={() => onToggleStatus(u)}
                  sx={{ color: C.slate, mr: 0.2 }}
                  title={u.is_active === 1 ? "Nonaktifkan" : "Aktifkan"}
                >
                  {u.is_active === 1 ? <FiToggleLeft size={18} /> : <FiToggleRight size={18} />}
                </IconButton>
                <IconButton size="small" onClick={() => onView(u)} sx={{ color: C.slate, mr: 0.2 }}>
                  <FiEye size={15} />
                </IconButton>
                <IconButton size="small" onClick={() => onEdit(u)} sx={{ color: C.indigo, mr: 0.2 }}>
                  <FiEdit2 size={15} />
                </IconButton>
                <IconButton size="small" onClick={() => onDelete(u)} sx={{ color: C.red }}>
                  <FiTrash2 size={15} />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {list.length === 0 && (
        <Box sx={{ py: 6, textAlign: "center", color: C.textFaint, fontSize: 13.5 }}>
          Tidak ada user yang sesuai dengan filter.
        </Box>
      )}
    </Box>
  );
}

// ─── Subkomponen: Detail Item ─────────────────────────────────────────────
function DetailItem({ icon, label, value, fullWidth }) {
  return (
    <Box sx={{ gridColumn: fullWidth ? "1 / -1" : "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.4 }}>
        <Box sx={{ color: C.amber, display: "flex" }}>{icon}</Box>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: C.textFaint,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 13.5, color: C.text }}>{value}</Typography>
    </Box>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatTanggal(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const primaryBtnSx = {
  textTransform: "none",
  fontWeight: 600,
  fontSize: 13.5,
  borderRadius: "10px",
  bgcolor: C.amber,
  color: "#1A1200",
  boxShadow: "none",
  "&:hover": { bgcolor: "#DE9A2E", boxShadow: "none" },
};