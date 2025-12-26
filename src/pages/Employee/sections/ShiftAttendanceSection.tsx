/**
 * Shift & Attendance Section - Central control for attendance behavior
 */

import React, { useState, useEffect } from 'react';
import { EmployeeDetails, UpdateEmployeeDetailsRequest, AttendanceMode } from '@/types';
import { SectionWrapper } from '@/components/EmployeeDetails/SectionWrapper';
import { shiftService } from '@/services/shift.service';
import { Shift } from '@/types/shift';
import './ShiftAttendanceSection.css';

interface ShiftAttendanceSectionProps {
  employee: EmployeeDetails;
  onUpdate: (request: UpdateEmployeeDetailsRequest) => Promise<void>;
  canEdit: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onUnsavedChange: (hasChanges: boolean) => void;
}

export const ShiftAttendanceSection: React.FC<ShiftAttendanceSectionProps> = ({
  employee,
  onUpdate,
  canEdit,
  isExpanded,
  onToggle,
  onUnsavedChange,
}) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);

  useEffect(() => {
    if (isExpanded && canEdit) {
      loadShifts();
    }
  }, [isExpanded, canEdit]);

  const loadShifts = async () => {
    try {
      setLoadingShifts(true);
      const response = await shiftService.listShifts({ status: 'active' });
      setShifts(response.shifts || []);
    } catch (error) {
      console.error('Failed to load shifts:', error);
    } finally {
      setLoadingShifts(false);
    }
  };

  const handleShiftChange = async (shiftId: string) => {
    const update: UpdateEmployeeDetailsRequest = {
      assignedShiftId: shiftId || undefined,
      shiftAssignmentType: shiftId ? 'permanent' : undefined,
    };
    await onUpdate(update);
    onUnsavedChange(false);
  };

  const handleAssignmentTypeChange = async (type: string) => {
    const update: UpdateEmployeeDetailsRequest = {
      shiftAssignmentType: type as any,
    };
    await onUpdate(update);
    onUnsavedChange(false);
  };

  const handleDateChange = async (field: string, value: string) => {
    const update: UpdateEmployeeDetailsRequest = {
      [field]: value || undefined,
    };
    await onUpdate(update);
    onUnsavedChange(false);
  };

  const handleAttendanceModeChange = async (mode: string) => {
    const update: UpdateEmployeeDetailsRequest = {
      attendanceMode: mode as AttendanceMode,
    };
    await onUpdate(update);
    onUnsavedChange(false);
  };

  const handleToggle = async (field: string, value: boolean) => {
    const update: UpdateEmployeeDetailsRequest = {
      [field]: value,
    };
    await onUpdate(update);
    onUnsavedChange(false);
  };

  return (
    <SectionWrapper
      title="Shift & Attendance Configuration"
      icon="🕐"
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="shift-attendance-content">
        <div className="shift-attendance-grid">
          {canEdit ? (
            <div className="form-field">
              <label className="field-label">Assigned Shift</label>
              <select
                className="form-select"
                value={employee.assignedShift?.id || ''}
                onChange={(e) => handleShiftChange(e.target.value)}
                disabled={!canEdit || loadingShifts}
              >
                <option value="">No shift assigned</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.code}) - {shift.startTime} to {shift.endTime}
                  </option>
                ))}
              </select>
              <small className="field-hint">Changes do not retroactively affect attendance</small>
            </div>
          ) : (
            <div className="form-field">
              <label className="field-label">Assigned Shift</label>
              <div className="field-value read-only">
                {employee.assignedShift
                  ? `${employee.assignedShift.name} (${employee.assignedShift.code})`
                  : '—'}
              </div>
            </div>
          )}

          {canEdit ? (
            <div className="form-field">
              <label className="field-label">Assignment Type</label>
              <select
                className="form-select"
                value={employee.shiftAssignmentType || ''}
                onChange={(e) => handleAssignmentTypeChange(e.target.value)}
                disabled={!canEdit}
              >
                <option value="">Select type</option>
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary</option>
                <option value="rotational">Rotational</option>
                <option value="override">Override</option>
              </select>
            </div>
          ) : (
            <div className="form-field">
              <label className="field-label">Assignment Type</label>
              <div className="field-value read-only">
                {employee.shiftAssignmentType || '—'}
              </div>
            </div>
          )}

          {(employee.shiftAssignmentType === 'temporary' || employee.shiftAssignmentType === 'override') && (
            <>
              <div className="form-field">
                <label className="field-label">Effective From</label>
                {canEdit ? (
                  <input
                    type="date"
                    className="form-input"
                    value={employee.shiftEffectiveFrom ? employee.shiftEffectiveFrom.split('T')[0] : ''}
                    onChange={(e) => handleDateChange('shiftEffectiveFrom', e.target.value)}
                    disabled={!canEdit}
                  />
                ) : (
                  <div className="field-value read-only">
                    {employee.shiftEffectiveFrom
                      ? new Date(employee.shiftEffectiveFrom).toLocaleDateString()
                      : '—'}
                  </div>
                )}
              </div>

              <div className="form-field">
                <label className="field-label">Effective To</label>
                {canEdit ? (
                  <input
                    type="date"
                    className="form-input"
                    value={employee.shiftEffectiveTo ? employee.shiftEffectiveTo.split('T')[0] : ''}
                    onChange={(e) => handleDateChange('shiftEffectiveTo', e.target.value)}
                    disabled={!canEdit}
                  />
                ) : (
                  <div className="field-value read-only">
                    {employee.shiftEffectiveTo
                      ? new Date(employee.shiftEffectiveTo).toLocaleDateString()
                      : '—'}
                  </div>
                )}
              </div>
            </>
          )}

          {canEdit ? (
            <div className="form-field">
              <label className="field-label">Attendance Mode</label>
              <select
                className="form-select"
                value={employee.attendanceMode || AttendanceMode.STRICT}
                onChange={(e) => handleAttendanceModeChange(e.target.value)}
                disabled={!canEdit}
              >
                <option value={AttendanceMode.STRICT}>Strict</option>
                <option value={AttendanceMode.FLEXIBLE}>Flexible</option>
              </select>
            </div>
          ) : (
            <div className="form-field">
              <label className="field-label">Attendance Mode</label>
              <div className="field-value read-only">
                {employee.attendanceMode || AttendanceMode.STRICT}
              </div>
            </div>
          )}

          <div className="form-field toggle-field">
            <label className="field-label">Allow Manual Attendance Override</label>
            {canEdit ? (
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={employee.allowManualAttendanceOverride || false}
                  onChange={(e) => handleToggle('allowManualAttendanceOverride', e.target.checked)}
                  disabled={!canEdit}
                />
                <span className="toggle-slider"></span>
              </label>
            ) : (
              <div className="field-value read-only">
                {employee.allowManualAttendanceOverride ? 'Yes' : 'No'}
              </div>
            )}
          </div>

          <div className="form-field toggle-field">
            <label className="field-label">Location Restriction Override</label>
            {canEdit ? (
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={employee.locationRestrictionOverride || false}
                  onChange={(e) => handleToggle('locationRestrictionOverride', e.target.checked)}
                  disabled={!canEdit}
                />
                <span className="toggle-slider"></span>
              </label>
            ) : (
              <div className="field-value read-only">
                {employee.locationRestrictionOverride ? 'Yes' : 'No'}
              </div>
            )}
          </div>

          <div className="form-field toggle-field">
            <label className="field-label">Device Restriction Override</label>
            {canEdit ? (
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={employee.deviceRestrictionOverride || false}
                  onChange={(e) => handleToggle('deviceRestrictionOverride', e.target.checked)}
                  disabled={!canEdit}
                />
                <span className="toggle-slider"></span>
              </label>
            ) : (
              <div className="field-value read-only">
                {employee.deviceRestrictionOverride ? 'Yes' : 'No'}
              </div>
            )}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
};

