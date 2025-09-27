"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Camera, Check, X } from "lucide-react";

// Types
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

// Mock data
const mockUsers: User[] = [
  { id: crypto.randomUUID(), name: "Admin User", email: "admin@example.com", password: "admin123", role: "admin" },
  { id: crypto.randomUUID(), name: "John Employee", email: "john@example.com", password: "john123", role: "employee" },
];

const mockTasks: Task[] = [];
const mockPhotos: Photo[] = [];

export default function PhotoRepositoryApp() {
  // -------------------- Authentication --------------------
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // -------------------- Admin State --------------------
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "employee" as UserRole });
  const [newTask, setNewTask] = useState({ title: "", description: "", assignedTo: "" });

  // -------------------- Employee State --------------------
  const [photos, setPhotos] = useState<Photo[]>(mockPhotos);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoDescription, setPhotoDescription] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // -------------------- UI State --------------------
  const [activeTab, setActiveTab] = useState<"dashboard" | "tasks" | "photos">("dashboard");
  const [adminNotifications, setAdminNotifications] = useState<string[]>([]);
  const [employeeNotifications, setEmployeeNotifications] = useState<string[]>([]);

  // -------------------- Notifications --------------------
  const addNotification = (msg: string, to: "admin" | "employee" = "admin") => {
    if (to === "admin") setAdminNotifications(prev => [...prev, msg]);
    else setEmployeeNotifications(prev => [...prev, msg]);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setAdminNotifications([]);
      setEmployeeNotifications([]);
    }, 5000);
    return () => clearTimeout(timer);
  }, [adminNotifications, employeeNotifications]);

  // -------------------- Authentication Functions --------------------
  const handleLogin = () => {
    const user = users.find(
      u => u.email.trim().toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (user) {
      setCurrentUser(user);
      setEmail("");
      setPassword("");
    } else {
      addNotification("Invalid credentials", currentUser?.role || "admin");
    }
  };

  const handleLogout = () => setCurrentUser(null);

  // -------------------- Admin Functions --------------------
  const handleAddUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      addNotification("Please fill all fields for new user");
      return;
    }
    if (users.some(u => u.email.trim().toLowerCase() === newUser.email.trim().toLowerCase())) {
      addNotification("Email already exists");
      return;
    }
    const user: User = { id: crypto.randomUUID(), ...newUser };
    setUsers(prev => [...prev, user]);
    setNewUser({ name: "", email: "", password: "", role: "employee" });
    addNotification(`User ${user.name} added successfully`);
  };

  const handleAddTask = () => {
    if (!newTask.title || !newTask.assignedTo) {
      addNotification("Please provide task title and assign to a user");
      return;
    }
    const task: Task = {
      id: crypto.randomUUID(),
      ...newTask,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [...prev, task]);
    setNewTask({ title: "", description: "", assignedTo: "" });
    addNotification(`Task "${task.title}" assigned to ${users.find(u=>u.id===task.assignedTo)?.name}`, "admin");
    addNotification(`New task assigned: "${task.title}"`, "employee");
  };

  // -------------------- Camera Functions --------------------
  const startCamera = async () => {
    try {
      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      addNotification("Cannot access camera", currentUser?.role || "employee");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setCapturedPhoto(canvas.toDataURL("image/png"));
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleSavePhoto = () => {
    if (!capturedPhoto || !photoDescription || !currentUser) {
      addNotification("Please capture photo and add description", currentUser?.role);
      return;
    }
    const photo: Photo = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      url: capturedPhoto,
      description: photoDescription,
      uploadedBy: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    setPhotos(prev => [photo, ...prev]);
    setCapturedPhoto(null);
    setPhotoDescription("");
    addNotification("Photo saved successfully", currentUser.role);
  };

  // -------------------- Task Completion --------------------
  const markTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "completed" } : t));
    const task = tasks.find(t => t.id === taskId);
    if (task && currentUser) {
      addNotification(`Task "${task.title}" completed by ${currentUser.name}`, "admin");
      addNotification(`You completed task "${task.title}"`, "employee");
    }
  };

  // -------------------- Derived State --------------------
  const employeePhotos = useMemo(() => photos.filter(p => p.uploadedBy === currentUser?.id), [photos, currentUser]);
  const employeeTasks = useMemo(() => tasks.filter(t => t.assignedTo === currentUser?.id), [tasks, currentUser]);

  // -------------------- Render Login --------------------
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 flex items-center justify-center mb-4">
              <Camera className="text-gray-500" />
            </div>
            <CardTitle className="text-2xl">Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label>Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} />
            <Label>Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <Button onClick={handleLogin} className="w-full">Login</Button>
            <div className="text-sm text-gray-500 pt-2">
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
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </header>

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
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-sm text-gray-600">{u.email} – {u.role}</div>
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
                    <div className="text-xs text-gray-500">Status: {t.status}</div>
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
                    <div key={p.id} className="border rounded overflow-hidden">
                      <img src={p.url || "/placeholder.png"} className="w-full h-32 object-cover" alt={p.description || "Photo"} />
                      <div className="p-2 text-sm">
                        <div className="font-medium">{p.description}</div>
                        <div className="text-xs text-gray-500">By: {users.find(u => u.id === p.uploadedBy)?.name || "Unknown"}</div>
                        <div className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </CardContent>
          </Card>
        </main>

        {/* Notifications */}
        {adminNotifications.length > 0 &&
          <div className="fixed top-4 right-4 space-y-2">
            {adminNotifications.map((note, i) => (
              <div key={i} className="bg-indigo-500 text-white px-4 py-2 rounded-lg shadow">{note}</div>
            ))}
          </div>
        }
      </div>
    );
  }

  // -------------------- Employee Dashboard --------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Employee Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>Logout</Button>
      </header>

      {/* Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="flex space-x-8 px-4">
          <button className={`py-4 ${activeTab === "dashboard" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500"}`} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={`py-4 ${activeTab === "tasks" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500"}`} onClick={() => setActiveTab("tasks")}>My Tasks</button>
          <button className={`py-4 ${activeTab === "photos" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500"}`} onClick={() => setActiveTab("photos")}>My Photos</button>
        </div>
      </nav>

      <main className="p-4 space-y-6">
        {activeTab === "dashboard" && (
          <Card>
            <CardHeader><CardTitle>Capture Photo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!capturedPhoto ? (
                <div className="space-y-4 text-center">
                  <video ref={videoRef} className="mx-auto w-64 h-48 border-2 rounded-lg" />
                  <div className="flex space-x-2 justify-center">
                    <Button onClick={startCamera}>Start Camera</Button>
                    <Button onClick={capturePhoto}>Capture</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <img src={capturedPhoto} className="w-full h-64 object-cover rounded-lg" />
                  <Textarea placeholder="Add description" value={photoDescription} onChange={e => setPhotoDescription(e.target.value)} rows={3} />
                  <div className="flex space-x-2">
                    <Button onClick={handleSavePhoto}><Check className="mr-2 h-4 w-4" />Save</Button>
                    <Button variant="outline" onClick={() => setCapturedPhoto(null)}><X className="mr-2 h-4 w-4" />Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>

            {employeePhotos.length > 0 &&
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
            }
          </Card>
        )}

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
                        <div className="text-xs text-gray-500">Status: {t.status} • {new Date(t.createdAt).toLocaleString()}</div>
                      </div>
                      {t.status === "pending" && <Button size="sm" onClick={() => markTaskComplete(t.id)}>Mark Complete</Button>}
                    </li>
                  ))}
                </ul>
              }
            </CardContent>
          </Card>
        )}

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

      {/* Notifications */}
      {employeeNotifications.length > 0 &&
        <div className="fixed top-4 right-4 space-y-2">
          {employeeNotifications.map((note, i) => (
            <div key={i} className="bg-green-500 text-white px-4 py-2 rounded-lg shadow">{note}</div>
          ))}
        </div>
      }
    </div>
  );
}
