import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function AddTopic() {
  const navigate = useNavigate();
  const [topicData, setTopicData] = useState({
    title: '',
    description: '',
    requiredSkills: '',
    duration: ''
  });

  const projectsCollectionRef = collection(db, 'projects');

  const handleCreate = async () => {
    if (!topicData.title.trim()) {
      alert("Title is required!");
      return;
    }
    await addDoc(projectsCollectionRef, { 
      ...topicData, 
      status: 'Open' 
    });
    // ডেটা সেভ হওয়ার পর আবার মেইন ড্যাশবোর্ডে ব্যাক করবে
    navigate('/dashboard');
  };

  return (
    <div className="p-8 max-w-3xl mx-auto mt-10 bg-zinc-50 rounded-xl shadow-sm border">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Post a New Research Topic</h1>
        {/* Back Button */}
        <Button onClick={() => navigate('/dashboard')} className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800">
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Input 
          placeholder="Project Title" 
          value={topicData.title} 
          onChange={(e) => setTopicData({...topicData, title: e.target.value})}
        />
        <Input 
          placeholder="Estimated Duration (e.g., 3 Months)" 
          value={topicData.duration} 
          onChange={(e) => setTopicData({...topicData, duration: e.target.value})}
        />
        <Input 
          placeholder="Required Skills (e.g., React, Python)" 
          value={topicData.requiredSkills} 
          onChange={(e) => setTopicData({...topicData, requiredSkills: e.target.value})}
          className="md:col-span-2"
        />
        <Input 
          placeholder="Brief Description" 
          value={topicData.description} 
          onChange={(e) => setTopicData({...topicData, description: e.target.value})}
          className="md:col-span-2"
        />
      </div>

      <Button onClick={handleCreate} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white">
        Publish Topic
      </Button>
    </div>
  );
}