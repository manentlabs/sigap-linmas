// frontend/src/theme/theme.js
import { createTheme } from "@mui/material/styles";

// Palet mengikuti identitas "SIGAP Linmas" (kini varian light — aksen amber tetap sama)
const theme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#F7F9FC", // bg utama, sama dengan BeritaPage.jsx
      paper: "#FFFFFF",   // panel/card/dialog
    },
    primary: {
      main: "#F2A93B", // amber — identitas Linmas
      contrastText: "#1A1200",
    },
    secondary: {
      main: "#0EA5A5", // teal — status aman/aktif
    },
    error: {
      main: "#E5484D",
    },
    text: {
      primary: "#131C2B",   // C.text
      secondary: "#64748B", // C.textDim
      disabled: "#94A3B8",  // C.textFaint
    },
    divider: "#E4E9F2", // C.border
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'Inter', 'Roboto', sans-serif",
    h1: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 },
    h2: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 },
    h3: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 },
    h4: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 },
    h5: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 },
    body1: { fontSize: "0.75rem" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none", // cegah overlay elevation ala dark mode MUI
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          color: "#131C2B",
        },
      },
    },
  },
});

export default theme;