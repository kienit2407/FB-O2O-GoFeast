import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { ConfigProvider, theme } from "antd";
import "antd/dist/reset.css";

createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#EE4D2D",
                    borderRadius: 10,
                    fontFamily:
                        "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
                },
                algorithm: theme.defaultAlgorithm,
            }}
        >
            <App />
        </ConfigProvider>
    </React.StrictMode>
);