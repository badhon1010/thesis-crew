import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { AppRoutes } from "@/routes/AppRoutes";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;