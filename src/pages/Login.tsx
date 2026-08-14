import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (error: any) {
      alert('Login Error: ' + error.message);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50">
      <Card className="w-96 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">UIU Research Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
              type="email" 
              placeholder="Email address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
            <Input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <Button type="submit" className="w-full">Login</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}