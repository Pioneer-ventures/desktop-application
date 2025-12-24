/**
 * Employee Management Component - Minimal, compact design
 * For HR and Admin to manage employees (create, edit, delete)
 */

import React, { useState, useEffect } from 'react';
import { employeeService, CreateEmployeeRequest, UpdateEmployeeRequest } from '@/services/employee.service';
import { User, UserRole } from '@/types';
import { Button, Input, Card } from '@/shared/components/ui';
import './EmployeeManagement.css';

export const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [formData, setFormData] = useState<CreateEmployeeRequest>({
    email: '',
    name: '',
    password: '',
    role: UserRole.EMPLOYEE,
    department: '',
    phoneNumber: '',
    employeeId: '',
    designation: '',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getAllEmployees();
      setEmployees(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setFormData({
      email: '',
      name: '',
      password: '',
      role: UserRole.EMPLOYEE,
      department: '',
      phoneNumber: '',
      employeeId: '',
      designation: '',
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleEditEmployee = (employee: User) => {
    setEditingEmployee(employee);
    setFormData({
      email: employee.email,
      name: employee.name,
      password: '',
      role: employee.role,
      department: employee.department || '',
      phoneNumber: employee.phoneNumber || '',
      employeeId: employee.employeeId || '',
      designation: employee.designation || '',
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingEmployee(null);
    setFormData({
      email: '',
      name: '',
      password: '',
      role: UserRole.EMPLOYEE,
      department: '',
      phoneNumber: '',
      employeeId: '',
      designation: '',
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.email || !formData.name) {
      setError('Email and name are required');
      return;
    }

    if (!editingEmployee && !formData.password) {
      setError('Password is required for new employees');
      return;
    }

    try {
      setLoading(true);

      if (editingEmployee) {
        const updateData: UpdateEmployeeRequest = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department || undefined,
          phoneNumber: formData.phoneNumber || undefined,
          employeeId: formData.employeeId || undefined,
          designation: formData.designation || undefined,
        };
        await employeeService.updateEmployee(editingEmployee.id, updateData);
        setSuccess('Employee updated successfully');
      } else {
        await employeeService.createEmployee(formData as CreateEmployeeRequest);
        setSuccess('Employee created successfully');
      }

      await loadEmployees();
      handleCancelForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${editingEmployee ? 'update' : 'create'} employee`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (employee: User) => {
    if (!window.confirm(`Are you sure you want to delete ${employee.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await employeeService.deleteEmployee(employee.id);
      setSuccess('Employee deleted successfully');
      await loadEmployees();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete employee');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading && employees.length === 0) {
    return <div className="employee-management-loading">Loading employees...</div>;
  }

  return (
    <div className="employee-management">
      <div className="employee-management-header">
        <div>
          <h2>Employee Management</h2>
          <p className="section-description">Create, edit, and manage employees</p>
        </div>
        {!showForm && (
          <Button variant="primary" onClick={handleAddEmployee}>
            Add Employee
          </Button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showForm && (
        <Card className="employee-form-card" padding="lg">
          <div className="employee-form-header">
            <h3>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h3>
            <Button variant="ghost" size="sm" onClick={handleCancelForm}>
              Cancel
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="employee-form">
            <div className="form-row">
              <Input
                label="Name *"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <Input
                label="Email *"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading || !!editingEmployee}
              />
            </div>

            <div className="form-row">
              <div className="input-group">
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="input"
                >
                  <option value={UserRole.EMPLOYEE}>Employee</option>
                  <option value={UserRole.MANAGER}>Manager</option>
                  <option value={UserRole.HR}>HR</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>
              <Input
                label="Department"
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-row">
              <Input
                label="Employee ID"
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                disabled={loading}
              />
              <Input
                label="Designation"
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-row">
              <Input
                label="Phone Number"
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={loading}
              />
              {!editingEmployee && (
                <Input
                  label="Password *"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!editingEmployee}
                  disabled={loading}
                />
              )}
            </div>

            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={handleCancelForm} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Create Employee'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!showForm && (
        <Card className="employee-list-card" padding="none">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Employee ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">
                    No employees found. Click "Add Employee" to create one.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>
                      <span className={`role-badge role-badge--${employee.role}`}>{employee.role}</span>
                    </td>
                    <td>{employee.department || '-'}</td>
                    <td>{employee.employeeId || '-'}</td>
                    <td>
                      <div className="table-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEmployee(employee)}
                          disabled={loading}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(employee)}
                          disabled={loading}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

