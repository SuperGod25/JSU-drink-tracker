import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, userRole, loading } = useAuth();

  // Redirect authenticated users to dashboard
  if (!loading && user && userRole) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            JSU Volunteer Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Junior Summer University participant management system for volunteers and administrators.
            </p>
            <Button 
              onClick={() => window.location.href = '/login'} 
              className="w-full"
            >
              Sign In to Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
