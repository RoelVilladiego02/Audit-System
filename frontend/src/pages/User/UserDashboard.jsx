import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

const UserDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="container py-4">
            <h1 className="mb-4">Welcome, {user?.name}</h1>
            
            <div className="row g-4">
                <div className="col-md-6">
                    <div className="card h-100">
                        <div className="card-body">
                            <h5 className="card-title">Start New Audit</h5>
                            <p className="card-text">Begin a new audit assessment using our comprehensive questionnaire.</p>
                            <Link to="/audit" className="btn btn-primary">
                                Start Audit
                            </Link>
                        </div>
                    </div>
                </div>
                
                <div className="col-md-6">
                    <div className="card h-100">
                        <div className="card-body">
                            <h5 className="card-title">View Submissions</h5>
                            <p className="card-text">Review your previous audit submissions and their status.</p>
                            <Link to="/submissions" className="btn btn-primary">
                                View Submissions
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="card h-100">
                        <div className="card-body">
                            <h5 className="card-title">Analytics</h5>
                            <p className="card-text">View analytics and insights from your audit submissions.</p>
                            <Link to="/analytics" className="btn btn-primary">
                                View Analytics
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
