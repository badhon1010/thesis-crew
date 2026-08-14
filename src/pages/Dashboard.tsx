import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Trash2, Edit2, PlusCircle } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  requiredSkills: string;
  duration: string;
  status: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Update-এর জন্য স্টেট
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const projectsCollectionRef = collection(db, 'projects');

  // ================= READ =================
  const fetchProjects = async () => {
    const data = await getDocs(projectsCollectionRef);
    setProjects(data.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Project)));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // ================= UPDATE =================
  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSave = async () => {
    if (!editingProject) return;
    const projectDoc = doc(db, 'projects', editingProject.id);
    await updateDoc(projectDoc, {
      title: editingProject.title,
      description: editingProject.description,
      requiredSkills: editingProject.requiredSkills,
      duration: editingProject.duration,
    });
    setIsEditDialogOpen(false);
    setEditingProject(null);
    fetchProjects();
  };

  // ================= DELETE =================
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this topic?")) {
      const projectDoc = doc(db, 'projects', id);
      await deleteDoc(projectDoc);
      fetchProjects();
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-zinc-800">Research Projects Dashboard</h1>
        {/* Navigation Button to Add Page */}
        <Button onClick={() => navigate('/add-topic')} className="bg-zinc-900 hover:bg-zinc-800 text-white flex items-center gap-2">
          <PlusCircle className="w-4 h-4" /> Add New Topic
        </Button>
      </div>

      {/* ---------------- READ SECTION ---------------- */}
      <div className="grid gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="shadow-sm border-zinc-200">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-xl mb-1">{project.title}</CardTitle>
                <span className={`text-sm font-semibold px-2 py-1 rounded-full ${project.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>
                  {project.status}
                </span>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => openEditDialog(project)} className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-none" size="icon" title="Edit Topic">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button onClick={() => handleDelete(project.id)} className="bg-red-600 hover:bg-red-700 text-white border-none" size="icon" title="Delete Topic">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mt-2 space-y-2 text-sm text-zinc-600">
                <p><strong>Description:</strong> {project.description || 'N/A'}</p>
                <p><strong>Required Skills:</strong> {project.requiredSkills || 'N/A'}</p>
                <p><strong>Duration:</strong> {project.duration || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {projects.length === 0 && (
          <div className="text-center py-12 bg-zinc-50 rounded-lg border">
            <p className="text-zinc-500 mb-4">No projects posted yet.</p>
            <Button onClick={() => navigate('/add-topic')} className="bg-zinc-900 hover:bg-zinc-800 text-white">Create the first one</Button>
          </div>
        )}
      </div>

      {/* ---------------- EDIT DIALOG (MODAL) ---------------- */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Research Topic</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <div className="space-y-4 my-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input 
                  value={editingProject.title} 
                  onChange={(e) => setEditingProject({...editingProject, title: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input 
                  value={editingProject.description} 
                  onChange={(e) => setEditingProject({...editingProject, description: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Required Skills</label>
                <Input 
                  value={editingProject.requiredSkills} 
                  onChange={(e) => setEditingProject({...editingProject, requiredSkills: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Duration</label>
                <Input 
                  value={editingProject.duration} 
                  onChange={(e) => setEditingProject({...editingProject, duration: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsEditDialogOpen(false)} className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800">
              Cancel
            </Button>
            <Button onClick={handleUpdateSave} className="bg-zinc-900 hover:bg-zinc-800 text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}