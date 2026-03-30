"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Camera, Check, X, Sun, Moon } from "lucide-react";

// -------------------- Types --------------------
type UserRole = "admin" | "employee";
type TaskStatus = "pending" | "completed";

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  status: TaskStatus;
  createdAt: string;
}

interface Photo {
  id: string;
  url: string;
  description: string;
  uploadedBy: string;
  createdAt: string;
}

// -------------------- Mock Data --------------------
const mockUsers: User[] = [
  { id: crypto.randomUUID(), name: "Admin User", email: "admin@example.com", password: "admin123", role: "admin" },
  { id: crypto.randomUUID(), name: "John Employee", email: "john@example.com", password: "john123", role: "employee" },
];

const mockTasks: Task[] = [];
const mockPhotos: Photo[] = [];
const API_BASE = "http://localhost:8000";

export default function PhotoRepositoryApp() {
  // -------------------- Authentication --------------------
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // -------------------- Admin State --------------------
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "employee" as UserRole });
  const [newTask, setNewTask] = useState({ title: "", description: "", assignedTo: "" });

  // -------------------- Employee State ----

  const [photos, setPhotos] = useState<Photo[]>(mockPhotos);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoDescription, setPhotoDescription] = useState("");
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingPhotoDescription, setEditingPhotoDescription] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");

  // -------------------- UI State --------------------
  type NotificationType = "info" | "success" | "error";
  interface NotificationItem { id: string; text: string; type: NotificationType; }

  const [activeTab, setActiveTab] = useState<"dashboard" | "tasks" | "photos">("dashboard");
  const [adminNotifications, setAdminNotifications] = useState<NotificationItem[]>([]);
  const [employeeNotifications, setEmployeeNotifications] = useState<NotificationItem[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "task">("all");
  const [darkTheme, setDarkTheme] = useState(false);

  const currentNotifications = currentUser?.role === "admin" ? adminNotifications : employeeNotifications;
  const taskNotifications = currentNotifications.filter(n => n.text.toLowerCase().includes("task"));

  // -------------------- Notifications --------------------
  const addNotification = (msg: unknown, to: "admin" | "employee" = "admin", type: NotificationType = "info") => {
    const text = typeof msg === "string" ? msg : JSON.stringify(msg);
    const item = { id: crypto.randomUUID(), text, type };
    if (to === "admin") setAdminNotifications(prev => [...prev, item]);
    else setEmployeeNotifications(prev => [...prev, item]);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setAdminNotifications([]);
      setEmployeeNotifications([]);
    }, 5000);
    return () => clearTimeout(timer);
  }, [adminNotifications, employeeNotifications]);

  // -------------------- Authentication Functions --------------------
  const loadBackendData = async () => {
    try {
      const [usersRes, tasksRes, photosRes] = await Promise.all([
        fetch(`${API_BASE}/users`),
        fetch(`${API_BASE}/tasks`),
        fetch(`${API_BASE}/photos`),
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (photosRes.ok) setPhotos(await photosRes.json());
    } catch (error) {
      console.error("Backend load error", error);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        let errText = "Invalid credentials";
        try {
          const errData = await res.json();
          if (typeof errData.detail === "string") errText = errData.detail;
          else if (Array.isArray(errData.detail)) errText = errData.detail.map((d: any) => d.msg || d).join("; ");
          else if (errData.detail) errText = JSON.stringify(errData.detail);
        } catch {
          errText = `Login failed: ${res.status} ${res.statusText}`;
        }
        setLoginError(errText);
        return;
      }
      const data = await res.json();
      setLoginError("");
      setCurrentUser({ ...data, password });
      setEmail("");
      setPassword("");
      await loadBackendData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cannot login to backend";
      addNotification(`Cannot login to backend: ${message}`, "admin", "error");
      setLoginError("Backend unreachable. Start the Python backend on port 8000.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUsers([]);
    setTasks([]);
    setPhotos([]);
  };

  const pageTheme = darkTheme
    ? "bg-slate-950 text-slate-100"
    : "bg-slate-50 text-slate-900";
  const cardTheme = darkTheme
    ? "bg-slate-800 border-slate-700 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";


  // -------------------- Admin Functions --------------------
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      addNotification("Please fill all fields for new user");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const err = await res.json();
        const message = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail || err || "Could not add user");
        addNotification(message);
        return;
      }
      const user = await res.json();
      setUsers(prev => [...prev, { ...user, password: newUser.password }]);
      setNewUser({ name: "", email: "", password: "", role: "employee" });
      addNotification(`User ${user.name} added successfully`);
      await loadBackendData();
    } catch {
      addNotification("Backend error adding user");
    }
  };

const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        const message = err.detail || `Could not delete user (${res.status})`;
        addNotification(message, "admin", "error");
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== userId));
      setTasks(prev => prev.filter(t => t.assignedTo !== userId));
      setPhotos(prev => prev.filter(p => p.uploadedBy !== userId));
      addNotification("User deleted", "admin", "success");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Backend error deleting user";
      addNotification(`Backend error deleting user: ${msg}`, "admin", "error");
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.assignedTo) {
      addNotification("Please provide task title and assign to a user");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      if (!res.ok) {
        const err = await res.json();
        const message = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail || err || "Could not add task");
        addNotification(message);
        return;
      }
      const task = await res.json();
      setTasks(prev => [...prev, task]);
      setNewTask({ title: "", description: "", assignedTo: "" });
      const assignee = users.find(u => u.id === task.assignedTo);
      const assigneeName = assignee?.name || "employee";
      addNotification(`You are assigned task "${task.title}"`, "employee", "info");
      addNotification(`Task "${task.title}" assigned to ${assigneeName}`, "admin", "info");
      await loadBackendData();
    } catch {
      addNotification("Backend error adding task");
    }
  };

  // -------------------- Camera Functions --------------------
  const startCamera = async (facing: "user" | "environment" = "environment") => {
    try {
      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      addNotification("Cannot access camera", currentUser?.role || "employee");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setCapturedPhoto(canvas.toDataURL("image/png"));
      stopCamera();
    }
  };

  const handleSavePhoto = async () => {
    if (!capturedPhoto || !currentUser) {
      addNotification("Please capture a photo before saving", currentUser?.role || "employee", "error");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: capturedPhoto,
          description: photoDescription || "No description",
          uploadedBy: currentUser.id,
        }),
      });
      if (!res.ok) {
        let message = "Could not save photo";
        try {
          const err = await res.json();
          message = err.detail || message;
        } catch {
          message = `Could not save photo: ${res.status} ${res.statusText}`;
        }
        addNotification(message, currentUser.role, "error");
        return;
      }
      const photo = await res.json();
      setPhotos(prev => [photo, ...prev]);
      setCapturedPhoto(null);
      setPhotoDescription("");
      setActiveTab("photos");
      addNotification("Photo saved successfully", currentUser.role, "success");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Backend error saving photo";
      addNotification(`Backend error saving photo: ${msg}`, currentUser.role, "error");
    }
  };

  const handleEditPhoto = (photo: Photo) => {
    setEditingPhotoId(photo.id);
    setEditingPhotoDescription(photo.description);
  };

  const handleSavePhotoEdit = async (photoId: string) => {
    try {
      const res = await fetch(`${API_BASE}/photos/${photoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editingPhotoDescription }),
      });
      if (!res.ok) {
        const err = await res.json();
        addNotification(err.detail || "Could not update photo", "admin", "error");
        return;
      }
      const updated = await res.json();
      setPhotos(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditingPhotoId(null);
      setEditingPhotoDescription("");
      addNotification("Photo updated successfully", "admin", "success");
    } catch {
      addNotification("Backend error updating photo", "admin", "error");
    }
  };

  // -------------------- Task Completion --------------------
  const markTaskComplete = async (taskId: string) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}/complete`, { method: "PUT" });
      if (!res.ok) {
        const err = await res.json();
        addNotification(err.detail || "Could not complete task", "admin");
        return;
      }
      const updated = await res.json();
      setTasks(prev => prev.map(t => (t.id === taskId ? updated : t)));
      const task = tasks.find(t => t.id === taskId);
      if (task && currentUser) {
        if (currentUser.role === "employee") {
          addNotification(`You completed task "${task.title}"`, "employee", "success");
          addNotification(`${currentUser.name} has completed task "${task.title}"`, "admin", "success");
        } else {
          addNotification(`Task "${task.title}" marked complete`, "admin", "success");
        }
      }
    } catch {
      addNotification("Backend error completing task", "admin", "error");
    }
  };

  // -------------------- Derived State --------------------
  const employeePhotos = useMemo(() => photos.filter(p => p.uploadedBy === currentUser?.id), [photos, currentUser]);
  const employeeTasks = useMemo(() => tasks.filter(t => t.assignedTo === currentUser?.id), [tasks, currentUser]);

  // -------------------- Login --------------------
  if (!currentUser) {
    return (
      <div className={`${pageTheme} min-h-screen flex items-center justify-center p-4`}>
        <Card className={`w-full max-w-xl p-4 ${cardTheme} border`}>
          <div className="text-center mb-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center mb-3">
              <Camera className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">Photo Task Manager</h1>
            <p className="text-slate-500">Secure team tasks, capture photos, and track progress.</p>
          </div>
          <CardContent className="space-y-3">
            <Label className={`${darkTheme ? "text-slate-100" : ""}`}>Email</Label>
            <Input className={`${darkTheme ? "bg-slate-700 text-white border-slate-600" : ""}`} value={email} onChange={e => setEmail(e.target.value)} />
            <Label className={`${darkTheme ? "text-slate-100" : ""}`}>Password</Label>
            <Input className={`${darkTheme ? "bg-slate-700 text-white border-slate-600" : ""}`} type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <Button onClick={handleLogin} className="w-full">Login</Button>
            {loginError && <div className="text-red-500 text-sm mt-2">{loginError}</div>}
            <div className={`${darkTheme ? "text-slate-300" : "text-slate-500"} text-sm pt-2`}>
              Admin: admin@example.com / Password: admin123<br/>
              Employee: john@example.com / Password: john123
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------------------- Admin Dashboard --------------------
  if (currentUser.role === "admin") {
    return (
      <div className={`${darkTheme ? "bg-slate-950 text-slate-100" : "bg-gray-50 text-black"} min-h-screen`}>
        <header className={`${darkTheme ? "bg-slate-800" : "bg-white"} shadow p-4 flex justify-between items-center`}>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center space-x-2">
              <Button onClick={() => setDarkTheme(!darkTheme)} variant="outline">
              {darkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-2 border rounded-lg px-2 py-1">
              <button onClick={() => { setNotificationFilter("all"); setShowNotificationPanel(!showNotificationPanel); }} className={`text-xs px-2 py-1 rounded ${notificationFilter === "all" ? "bg-indigo-600 text-white" : "bg-transparent"}`}>
                All ({currentNotifications.length})
              </button>
              <button onClick={() => { setNotificationFilter("task"); setShowNotificationPanel(!showNotificationPanel); }} className={`text-xs px-2 py-1 rounded ${notificationFilter === "task" ? "bg-indigo-600 text-white" : "bg-transparent"}`}>
                Task ({taskNotifications.length})
              </button>
            </div>
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
          </div>
        </header>
        {showNotificationPanel && (
          <div className="bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 p-2">
            <div className="flex gap-2 mb-2">
              <button onClick={() => setNotificationFilter("all")} className={`text-xs px-2 py-1 rounded ${notificationFilter === "all" ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-slate-700"}`}>All</button>
              <button onClick={() => setNotificationFilter("task")} className={`text-xs px-2 py-1 rounded ${notificationFilter === "task" ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-slate-700"}`}>Task</button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {(notificationFilter === "all" ? currentNotifications : taskNotifications).map(note => (
                <div key={note.id} className={`p-2 rounded text-xs ${note.type === "success" ? "bg-emerald-500 text-white" : note.type === "error" ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}>
                  {note.text}
                </div>
              ))}
              {(notificationFilter === "all" ? currentNotifications : taskNotifications).length === 0 && (
                <div className="text-xs text-gray-500">No notifications</div>
              )}
            </div>
          </div>
        )}

        <main className="p-4 space-y-8">
          {/* Users */}
          <Card>
            <CardHeader><CardTitle>Users</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4 space-y-2">
                <Input placeholder="Name" value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} />
                <Input placeholder="Email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} />
                <Input type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} />
                <select className="border rounded p-2 w-full" value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value as UserRole }))}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
                <Button onClick={handleAddUser}>Add User</Button>
              </div>
              <ul className="space-y-2">
                  {users.map(u => (
                    <li key={u.id} className="border p-2 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{u.name}</div>
                          <div className="text-sm text-gray-600">{u.email} – {u.role}</div>
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(u.id)}>Delete</Button>
                      </div>
                    </li>
                  ))}
                </ul>
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4 space-y-2">
                <Input placeholder="Task Title" value={newTask.title} onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))} />
                <Textarea placeholder="Description" value={newTask.description} onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))} />
                <select className="border rounded p-2 w-full" value={newTask.assignedTo} onChange={e => setNewTask(t => ({ ...t, assignedTo: e.target.value }))}>
                  <option value="">Assign to…</option>
                  {users.filter(u => u.role === "employee").map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <Button onClick={handleAddTask}>Add Task</Button>
              </div>
              <ul className="space-y-2">
                {tasks.map(t => (
                  <li key={t.id} className="border p-2 rounded">
                    <div className="font-semibold">{t.title}</div>
                    <div className="text-sm">{t.description}</div>
                    <div className="text-xs text-gray-500">Assigned to: {users.find(u => u.id === t.assignedTo)?.name || "—"}</div>
                    <div className={`text-xs ${t.status === "completed" ? "text-emerald-600 font-semibold" : "text-red-600"}`}>Status: {t.status}</div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader><CardTitle>All Photos</CardTitle></CardHeader>
            <CardContent>
              {photos.length === 0 ? <div className="text-gray-500">No photos uploaded yet.</div> :
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map(p => (
                    <div key={p.id} className="border rounded overflow-hidden bg-white dark:bg-slate-800">
                      <img src={p.url || "/placeholder.png"} className="w-full h-32 object-cover" alt={p.description || "Photo"} />
                      <div className="p-2 text-sm">
                        {editingPhotoId === p.id ? (
                          <div className="space-y-2">
                            <Textarea value={editingPhotoDescription} onChange={e => setEditingPhotoDescription(e.target.value)} rows={2} />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleSavePhotoEdit(p.id)}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingPhotoId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-medium">{p.description}</div>
                            <div className="text-xs text-gray-500">By: {users.find(u => u.id === p.uploadedBy)?.name || "Unknown"}</div>
                            <div className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleString()}</div>
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEditPhoto(p)}>Edit</Button>
                              <Button size="sm" variant="destructive" onClick={async () => {
                                try {
                                  const res = await fetch(`${API_BASE}/photos/${p.id}`, { method: "DELETE" });
                                  if (!res.ok) {
                                    const err = await res.json();
                                    addNotification(err.detail || "Could not delete photo", "admin", "error");
                                    return;
                                  }
                                  setPhotos(prev => prev.filter(x => x.id !== p.id));
                                  addNotification("Photo deleted successfully", "admin", "success");
                                } catch {
                                  addNotification("Backend error deleting photo", "admin", "error");
                                }
                              }}>Delete</Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              }
            </CardContent>
          </Card>
        </main>

        {/* Notifications */}
        {(adminNotifications.length > 0 || employeeNotifications.length > 0) && (
          <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {adminNotifications.map((note) => (
              <div
                key={note.id}
                className={`px-4 py-2 rounded-lg shadow text-sm ${note.type === "success" ? "bg-emerald-500 text-white" : note.type === "error" ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}
              >
                {note.text}
              </div>
            ))}
            {employeeNotifications.map((note) => (
              <div
                key={note.id}
                className={`px-4 py-2 rounded-lg shadow text-sm ${note.type === "success" ? "bg-emerald-500 text-white" : note.type === "error" ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}
              >
                {note.text}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -------------------- Employee Dashboard --------------------
  return (
    <div className={`${darkTheme ? "bg-slate-950 text-slate-100" : "bg-gray-50 text-black"} min-h-screen`}>
      <header className={`${darkTheme ? "bg-slate-800 text-slate-100" : "bg-white"} shadow p-4 flex justify-between items-center`}>
        <h1 className="text-2xl font-bold">Employee Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setDarkTheme(!darkTheme)} variant="outline">
            {darkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <div className="flex items-center gap-2 border rounded-lg px-2 py-1">
            <button onClick={() => { setNotificationFilter("all"); setShowNotificationPanel(!showNotificationPanel); }} className={`text-xs px-2 py-1 rounded ${notificationFilter === "all" ? "bg-indigo-600 text-white" : "bg-transparent"}`}>
              All ({currentNotifications.length})
            </button>
            <button onClick={() => { setNotificationFilter("task"); setShowNotificationPanel(!showNotificationPanel); }} className={`text-xs px-2 py-1 rounded ${notificationFilter === "task" ? "bg-indigo-600 text-white" : "bg-transparent"}`}>
              Task ({taskNotifications.length})
            </button>
          </div>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </header>
      {showNotificationPanel && (
        <div className="bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 p-2">
          <div className="flex gap-2 mb-2">
            <button onClick={() => setNotificationFilter("all")} className={`text-xs px-2 py-1 rounded ${notificationFilter === "all" ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-slate-700"}`}>All</button>
            <button onClick={() => setNotificationFilter("task")} className={`text-xs px-2 py-1 rounded ${notificationFilter === "task" ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-slate-700"}`}>Task</button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {(notificationFilter === "all" ? currentNotifications : taskNotifications).map(note => (
              <div key={note.id} className={`p-2 rounded text-xs ${note.type === "success" ? "bg-emerald-500 text-white" : note.type === "error" ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}>
                {note.text}
              </div>
            ))}
            {(notificationFilter === "all" ? currentNotifications : taskNotifications).length === 0 && (
              <div className="text-xs text-gray-500">No notifications</div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <nav className={`${darkTheme ? "bg-slate-800 border-slate-700" : "bg-white"} shadow-sm`}>
        <div className="flex space-x-8 px-4">
          <button className={`py-4 ${activeTab === "dashboard" ? "border-b-2 border-indigo-500 text-indigo-600" : darkTheme ? "text-slate-300" : "text-gray-500"}`} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={`py-4 ${activeTab === "tasks" ? "border-b-2 border-indigo-500 text-indigo-600" : darkTheme ? "text-slate-300" : "text-gray-500"}`} onClick={() => setActiveTab("tasks")}>My Tasks</button>
          <button className={`py-4 ${activeTab === "photos" ? "border-b-2 border-indigo-500 text-indigo-600" : darkTheme ? "text-slate-300" : "text-gray-500"}`} onClick={() => setActiveTab("photos")}>My Photos</button>
        </div>
      </nav>

      <main className="p-4 space-y-6">
        {/* -------------------- Dashboard (Capture Photo) -------------------- */}
        {activeTab === "dashboard" && (
          <Card>
            <CardHeader><CardTitle>Capture Photo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!capturedPhoto ? (
                <div className="space-y-4 text-center">
                  <video ref={videoRef} className="mx-auto w-64 h-48 border-2 rounded-lg" />
                  <div className="flex space-x-2 justify-center">
                    <Button onClick={() => startCamera(cameraFacing)}>Start Camera</Button>
                    <Button onClick={capturePhoto}>Capture</Button>
                    <Button
                      onClick={() => {
                        stopCamera();
                        const newFacing = cameraFacing === "user" ? "environment" : "user";
                        setCameraFacing(newFacing);
                        startCamera(newFacing);
                      }}
                    >
                      Switch Camera
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <img src={capturedPhoto} className="w-full h-64 object-cover rounded-lg" />
                  <Textarea
                    placeholder="Add description"
                    value={photoDescription}
                    onChange={e => setPhotoDescription(e.target.value)}
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <Button onClick={handleSavePhoto}><Check className="mr-2 h-4 w-4" />Save</Button>
                    <Button variant="outline" onClick={() => setCapturedPhoto(null)}><X className="mr-2 h-4 w-4" />Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>

            {employeePhotos.length > 0 && (
              <CardContent>
                <h2 className="text-lg font-semibold mb-2">Recent Photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {employeePhotos.map(p => (
                    <div key={p.id} className="border rounded overflow-hidden">
                      <img src={p.url || "/placeholder.png"} className="w-full h-32 object-cover" alt={p.description || "Photo"} />
                      <div className="p-2 text-sm">{p.description}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* -------------------- My Tasks -------------------- */}
        {activeTab === "tasks" && (
          <Card>
            <CardHeader><CardTitle>My Tasks</CardTitle></CardHeader>
            <CardContent>
              {employeeTasks.length === 0 ? <div className="text-gray-500">No tasks assigned yet.</div> :
                <ul className="space-y-2">
                  {employeeTasks.map(t => (
                    <li key={t.id} className="border p-2 rounded flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{t.title}</div>
                        <div className="text-sm">{t.description}</div>
                        <div className={`text-xs ${t.status === "completed" ? "text-emerald-600 font-semibold" : "text-red-600"}`}>Status: {t.status} • {new Date(t.createdAt).toLocaleString()}</div>
                      </div>
                      {t.status === "pending" && <Button size="sm" onClick={() => markTaskComplete(t.id)}>Mark Complete</Button>}
                    </li>
                  ))}
                </ul>
              }
            </CardContent>
          </Card>
        )}

        {/* -------------------- My Photos -------------------- */}
        {activeTab === "photos" && (
          <Card>
            <CardHeader><CardTitle>My Photos</CardTitle></CardHeader>
            <CardContent>
              {employeePhotos.length === 0 ? <div className="text-gray-500">No photos uploaded yet.</div> :
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {employeePhotos.map(p => (
                    <div key={p.id} className="border rounded overflow-hidden">
                      <img src={p.url || "/placeholder.png"} className="w-full h-32 object-cover" alt={p.description || "Photo"} />
                      <div className="p-2 text-sm">{p.description}</div>
                    </div>
                  ))}
                </div>
              }
            </CardContent>
          </Card>
        )}
      </main>

      {/* -------------------- Notifications -------------------- */}
      {(adminNotifications.length > 0 || employeeNotifications.length > 0) && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {adminNotifications.map((note) => (
            <div
              key={note.id}
              className={`px-4 py-2 rounded-lg shadow text-sm ${note.type === "success" ? "bg-emerald-500 text-white" : note.type === "error" ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}
            >
              {note.text}
            </div>
          ))}
          {employeeNotifications.map((note) => (
            <div
              key={note.id}
              className={`px-4 py-2 rounded-lg shadow text-sm ${note.type === "success" ? "bg-emerald-500 text-white" : note.type === "error" ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}
            >
              {note.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
