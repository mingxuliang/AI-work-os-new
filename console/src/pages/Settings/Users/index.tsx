import React, { useState, useRef, useCallback } from "react";
import {
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Space,
  Popconfirm,
  Upload,
  message as antdMessage,
  Avatar,
  Badge,
  Tooltip,
  Empty,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useTheme } from "../../../contexts/ThemeContext";
import styles from "./index.module.less";

// ── Types ─────────────────────────────────────────────────────────────────

type UserRole = "admin" | "manager" | "user" | "viewer";
type UserStatus = "active" | "inactive";

interface UserRecord {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  department: string;
  status: UserStatus;
  createdAt: string;
  lastLogin: string | null;
  avatar?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  admin:   { label: "管理员", color: "red" },
  manager: { label: "主管", color: "orange" },
  user:    { label: "普通用户", color: "blue" },
  viewer:  { label: "观察者", color: "default" },
};

const STORAGE_KEY = "qwenpaw_users";

function loadUsers(): UserRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  // Default demo users
  return [
    {
      id: "u-001",
      name: "系统管理员",
      username: "admin",
      email: "admin@company.com",
      role: "admin",
      department: "IT部门",
      status: "active",
      createdAt: "2025-01-01",
      lastLogin: new Date().toISOString(),
    },
    {
      id: "u-002",
      name: "张经理",
      username: "zhang.mgr",
      email: "zhang@company.com",
      role: "manager",
      department: "生产管理部",
      status: "active",
      createdAt: "2025-03-10",
      lastLogin: "2025-05-10T08:00:00Z",
    },
    {
      id: "u-003",
      name: "李芳",
      username: "li.fang",
      email: "lifang@company.com",
      role: "user",
      department: "销售支持部",
      status: "active",
      createdAt: "2025-04-01",
      lastLogin: "2025-05-09T14:30:00Z",
    },
    {
      id: "u-004",
      name: "王涛",
      username: "wang.tao",
      email: "wangtao@company.com",
      role: "user",
      department: "财务分析部",
      status: "inactive",
      createdAt: "2025-04-15",
      lastLogin: null,
    },
  ];
}

function saveUsers(users: UserRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function genId() {
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function getAvatarColor(name: string): string {
  const colors = ["#06b6d4", "#4ade80", "#f59e0b", "#a78bfa", "#f97316", "#ef4444"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(iso: string | null): string {
  if (!iso) return "从未登录";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" });
}

// ── CSV / JSON import parser ────────────────────────────────────────────────

function parseImportFile(content: string, filename: string): UserRecord[] {
  const ext = filename.split(".").pop()?.toLowerCase();
  const result: UserRecord[] = [];

  if (ext === "json") {
    const parsed = JSON.parse(content);
    const arr = Array.isArray(parsed) ? parsed : parsed.users ?? [];
    for (const row of arr) {
      result.push({
        id: row.id ?? genId(),
        name: String(row.name ?? row["姓名"] ?? ""),
        username: String(row.username ?? row["账号"] ?? ""),
        email: String(row.email ?? row["邮箱"] ?? ""),
        role: (row.role ?? row["角色"] ?? "user") as UserRole,
        department: String(row.department ?? row["部门"] ?? ""),
        status: (row.status ?? row["状态"] ?? "active") as UserStatus,
        createdAt: row.createdAt ?? new Date().toISOString().slice(0, 10),
        lastLogin: row.lastLogin ?? null,
      });
    }
  } else {
    // CSV
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, j) => { row[h] = cols[j] ?? ""; });
      result.push({
        id: row.id ?? genId(),
        name: row.name ?? row["姓名"] ?? "",
        username: row.username ?? row["账号"] ?? "",
        email: row.email ?? row["邮箱"] ?? "",
        role: (row.role ?? row["角色"] ?? "user") as UserRole,
        department: row.department ?? row["部门"] ?? "",
        status: (row.status ?? row["状态"] ?? "active") as UserStatus,
        createdAt: row.createdAt ?? new Date().toISOString().slice(0, 10),
        lastLogin: row.lastLogin ?? null,
      });
    }
  }
  return result.filter((u) => u.name && u.username);
}

// ── CSV template for download ───────────────────────────────────────────────

const CSV_TEMPLATE = `id,name,username,email,role,department,status
,张三,zhangsan,zhangsan@company.com,user,生产管理部,active
,李四,lisi,lisi@company.com,manager,财务部,active`;

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "users_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function exportUsers(users: UserRecord[]) {
  const header = "id,name,username,email,role,department,status,createdAt,lastLogin\n";
  const rows = users.map(
    (u) =>
      [u.id, u.name, u.username, u.email, u.role, u.department, u.status, u.createdAt, u.lastLogin ?? ""]
        .map((v) => `"${v}"`)
        .join(","),
  );
  const blob = new Blob([header + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function UsersPage() {
  const { isDark } = useTheme();
  const [users, setUsers] = useState<UserRecord[]>(loadUsers);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<UserRecord[]>([]);
  const [importFilename, setImportFilename] = useState("");
  const [form] = Form.useForm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const persist = (next: UserRecord[]) => {
    setUsers(next);
    saveUsers(next);
  };

  // ── Search filter ────────────────────────────────────────────────────────
  const filtered = search
    ? users.filter(
        (u) =>
          u.name.includes(search) ||
          u.username.includes(search) ||
          u.email.includes(search) ||
          u.department.includes(search),
      )
    : users;

  // ── Add / Edit ───────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditUser(null);
    form.resetFields();
    form.setFieldsValue({ role: "user", status: "active" });
    setModalOpen(true);
  };

  const openEditModal = (user: UserRecord) => {
    setEditUser(user);
    form.setFieldsValue(user);
    setModalOpen(true);
  };

  const handleModalOk = () => {
    form.validateFields().then((vals) => {
      if (editUser) {
        persist(users.map((u) => (u.id === editUser.id ? { ...u, ...vals } : u)));
        antdMessage.success("用户已更新");
      } else {
        const newUser: UserRecord = {
          id: genId(),
          lastLogin: null,
          createdAt: new Date().toISOString().slice(0, 10),
          ...vals,
        };
        persist([...users, newUser]);
        antdMessage.success("用户已添加");
      }
      setModalOpen(false);
    });
  };

  // ── Toggle status ────────────────────────────────────────────────────────
  const toggleStatus = (id: string) => {
    persist(
      users.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "active" ? "inactive" : "active" }
          : u,
      ),
    );
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteUser = (id: string) => {
    persist(users.filter((u) => u.id !== id));
    antdMessage.success("用户已删除");
  };

  // ── File import ──────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const parsed = parseImportFile(content, file.name);
        if (!parsed.length) {
          antdMessage.warning("文件中未识别到有效用户数据");
          return;
        }
        setImportFilename(file.name);
        setImportPreview(parsed);
        setImportModalOpen(true);
      } catch (err) {
        antdMessage.error("文件解析失败，请检查格式");
      }
    };
    reader.readAsText(file, "utf-8");
    // Reset so same file can re-import
    e.target.value = "";
  };

  const confirmImport = () => {
    const existingIds = new Set(users.map((u) => u.username));
    const toAdd = importPreview.filter((u) => !existingIds.has(u.username));
    const toUpdate = importPreview.filter((u) => existingIds.has(u.username));

    const updated = users.map((u) => {
      const found = toUpdate.find((nu) => nu.username === u.username);
      return found ? { ...u, ...found } : u;
    });
    persist([...updated, ...toAdd]);
    setImportModalOpen(false);
    antdMessage.success(`导入完成：新增 ${toAdd.length} 人，更新 ${toUpdate.length} 人`);
  };

  // ── Table columns ────────────────────────────────────────────────────────
  const columns: ColumnsType<UserRecord> = [
    {
      title: "用户",
      key: "user",
      width: 220,
      render: (_, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar
            style={{ background: getAvatarColor(r.name), flexShrink: 0, fontWeight: 700 }}
            size={36}
          >
            {r.name.slice(0, 1)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: isDark ? "#e2e8f0" : "#0f172a" }}>
              {r.name}
            </div>
            <div style={{ fontSize: 11, color: isDark ? "#64748b" : "#94a3b8" }}>@{r.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
      ellipsis: true,
      width: 200,
      render: (v) => <span style={{ fontSize: 13, color: isDark ? "#94a3b8" : "#475569" }}>{v || "—"}</span>,
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      width: 100,
      render: (role: UserRole) => (
        <Tag color={ROLE_CONFIG[role]?.color}>{ROLE_CONFIG[role]?.label ?? role}</Tag>
      ),
    },
    {
      title: "部门",
      dataIndex: "department",
      key: "department",
      width: 130,
      ellipsis: true,
      render: (v) => <span style={{ fontSize: 13 }}>{v || "—"}</span>,
    },
    {
      title: "状态",
      key: "status",
      width: 90,
      render: (_, r) => (
        <Badge
          status={r.status === "active" ? "success" : "default"}
          text={
            <span style={{ fontSize: 12, color: r.status === "active" ? "#4ade80" : "#64748b" }}>
              {r.status === "active" ? "启用" : "停用"}
            </span>
          }
        />
      ),
    },
    {
      title: "最后登录",
      key: "lastLogin",
      width: 150,
      render: (_, r) => (
        <span style={{ fontSize: 12, color: isDark ? "#64748b" : "#94a3b8" }}>
          {formatDate(r.lastLogin)}
        </span>
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 140,
      fixed: "right",
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="编辑">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEditModal(r)}
            />
          </Tooltip>
          <Tooltip title={r.status === "active" ? "停用" : "启用"}>
            <Switch
              size="small"
              checked={r.status === "active"}
              onChange={() => toggleStatus(r.id)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除该用户？"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteUser(r.id)}
          >
            <Tooltip title="删除">
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>用户管理</h2>
          <p className={styles.subtitle}>管理系统用户账号、权限与部门归属</p>
        </div>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={downloadTemplate}
          >
            下载模板
          </Button>
          <Button
            icon={<ExportOutlined />}
            onClick={() => exportUsers(users)}
          >
            导出
          </Button>
          <Button
            icon={<ImportOutlined />}
            onClick={() => fileInputRef.current?.click()}
          >
            导入文件
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            添加用户
          </Button>
        </Space>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Search + stats */}
      <div className={styles.toolbar}>
        <Input
          prefix={<SearchOutlined style={{ color: isDark ? "#64748b" : "#94a3b8" }} />}
          placeholder="搜索姓名、账号、邮箱、部门..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 320, borderRadius: 8 }}
        />
        <div className={styles.stats}>
          <span>共 <b>{users.length}</b> 名用户</span>
          <span style={{ color: "#4ade80" }}>
            启用 <b>{users.filter((u) => u.status === "active").length}</b>
          </span>
          <span style={{ color: "#64748b" }}>
            停用 <b>{users.filter((u) => u.status === "inactive").length}</b>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <Table<UserRecord>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          scroll={{ x: 900 }}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
          locale={{ emptyText: <Empty description="暂无用户" /> }}
          size="middle"
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        title={editUser ? "编辑用户" : "添加用户"}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        okText={editUser ? "保存" : "添加"}
        cancelText="取消"
        destroyOnHidden
        width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item name="name" label="姓名" rules={[{ required: true, message: "请填写姓名" }]}>
              <Input placeholder="张三" />
            </Form.Item>
            <Form.Item name="username" label="账号" rules={[{ required: true, message: "请填写账号" }]}>
              <Input placeholder="zhangsan" />
            </Form.Item>
          </div>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="zhangsan@company.com" />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item name="role" label="角色" rules={[{ required: true }]}>
              <Select>
                {Object.entries(ROLE_CONFIG).map(([k, v]) => (
                  <Select.Option key={k} value={k}>{v.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="active">启用</Select.Option>
                <Select.Option value="inactive">停用</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="department" label="部门">
            <Input placeholder="所属部门" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Preview Modal */}
      <Modal
        open={importModalOpen}
        title={`导入预览 · ${importFilename}`}
        onOk={confirmImport}
        onCancel={() => setImportModalOpen(false)}
        okText={`确认导入 ${importPreview.length} 条`}
        cancelText="取消"
        width={700}
        destroyOnHidden
      >
        <p style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: 13, marginBottom: 12 }}>
          已解析 <b>{importPreview.length}</b> 条用户数据，账号已存在的将会被更新，新账号将被创建。
        </p>
        <Table<UserRecord>
          columns={[
            { title: "姓名", dataIndex: "name", width: 100 },
            { title: "账号", dataIndex: "username", width: 120 },
            { title: "邮箱", dataIndex: "email", ellipsis: true },
            {
              title: "角色",
              dataIndex: "role",
              width: 90,
              render: (role: UserRole) => (
                <Tag color={ROLE_CONFIG[role]?.color}>{ROLE_CONFIG[role]?.label ?? role}</Tag>
              ),
            },
            { title: "部门", dataIndex: "department", width: 110 },
            {
              title: "操作",
              width: 70,
              render: (_, r) => (
                <Tag color={users.find((u) => u.username === r.username) ? "orange" : "green"}>
                  {users.find((u) => u.username === r.username) ? "更新" : "新增"}
                </Tag>
              ),
            },
          ]}
          dataSource={importPreview}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ y: 300 }}
        />

        <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", fontSize: 12, color: isDark ? "#64748b" : "#94a3b8" }}>
          <b>支持格式：</b>CSV / JSON &nbsp;·&nbsp;
          <b>CSV 列：</b>name, username, email, role, department, status &nbsp;·&nbsp;
          <span
            style={{ color: "#22d3ee", cursor: "pointer" }}
            onClick={downloadTemplate}
          >
            下载 CSV 模板
          </span>
        </div>
      </Modal>
    </div>
  );
}
