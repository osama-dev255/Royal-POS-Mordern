// vite.config.ts
import { defineConfig } from "file:///E:/PROJECTS/LOVABLE/bulletproofPOS/sheet-point-dash-Supabasedev255%20-%20Copy/node_modules/vite/dist/node/index.js";
import react from "file:///E:/PROJECTS/LOVABLE/bulletproofPOS/sheet-point-dash-Supabasedev255%20-%20Copy/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
var __vite_injected_original_dirname = "E:\\PROJECTS\\LOVABLE\\bulletproofPOS\\sheet-point-dash-Supabasedev255 - Copy";
var vite_config_default = defineConfig({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  // Add build configuration for better production optimization
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          utils: ["@/utils/printUtils", "@/utils/templateUtils"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxQUk9KRUNUU1xcXFxMT1ZBQkxFXFxcXGJ1bGxldHByb29mUE9TXFxcXHNoZWV0LXBvaW50LWRhc2gtU3VwYWJhc2VkZXYyNTUgLSBDb3B5XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxQUk9KRUNUU1xcXFxMT1ZBQkxFXFxcXGJ1bGxldHByb29mUE9TXFxcXHNoZWV0LXBvaW50LWRhc2gtU3VwYWJhc2VkZXYyNTUgLSBDb3B5XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9QUk9KRUNUUy9MT1ZBQkxFL2J1bGxldHByb29mUE9TL3NoZWV0LXBvaW50LWRhc2gtU3VwYWJhc2VkZXYyNTUlMjAtJTIwQ29weS92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICAvLyBBZGQgYnVpbGQgY29uZmlndXJhdGlvbiBmb3IgYmV0dGVyIHByb2R1Y3Rpb24gb3B0aW1pemF0aW9uXHJcbiAgYnVpbGQ6IHtcclxuICAgIG91dERpcjogXCJkaXN0XCIsXHJcbiAgICBhc3NldHNEaXI6IFwiYXNzZXRzXCIsXHJcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgIHZlbmRvcjogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxyXG4gICAgICAgICAgdXRpbHM6IFsnQC91dGlscy9wcmludFV0aWxzJywgJ0AvdXRpbHMvdGVtcGxhdGVVdGlscyddLFxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUEyWixTQUFTLG9CQUFvQjtBQUN4YixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFFQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixRQUFRLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ2pELE9BQU8sQ0FBQyxzQkFBc0IsdUJBQXVCO0FBQUEsUUFDdkQ7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
