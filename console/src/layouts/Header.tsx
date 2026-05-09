import { Layout, Space } from "antd";
import LanguageSwitcher from "../components/LanguageSwitcher/index";
import ThemeToggleButton from "../components/ThemeToggleButton";
import { useTranslation } from "react-i18next";
import styles from "./index.module.less";

const { Header: AntHeader } = Layout;

export default function Header() {
  const { t } = useTranslation();

  return (
    <AntHeader className={styles.header}>
      <div className={styles.logoWrapper}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(59,130,246,0.35)",
            flexShrink: 0,
            marginRight: 8,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 8v4l2.5 2.5" />
            <circle cx="18" cy="6" r="3" fill="white" stroke="none" />
          </svg>
        </div>
        <span className={styles.headerTitle}>{t("common.systemName")}</span>
      </div>
      <Space size="middle">
        <LanguageSwitcher />
        <ThemeToggleButton />
      </Space>
    </AntHeader>
  );
}
