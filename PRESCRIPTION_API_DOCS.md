# Prescription Delivery & Status Tracking System

## Overview
Complete prescription workflow system with status tracking (pending → approved → delivered/rejected).

## Backend Endpoints

### Doctor Endpoints (Requires JWT)

#### 1. Get List of Pharmacies
```http
GET /api/prescription/pharmacies
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "status": "success",
  "pharmacies": [
    {
      "pharmacy_id": 1,
      "name": "Central Pharmacy",
      "phone": "+250-123-456-789",
      "address": "Kigali, Rwanda",
      "latitude": -1.9536,
      "longitude": 30.0605
    }
  ]
}
```

#### 2. Send Prescription
```http
POST /api/prescription/send
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Request Body:
{
  "patient_id": 3,
  "pharmacy_id": 1,
  "medicines": [
    {
      "name": "Aspirin",
      "dosage": "500mg",
      "quantity": 10,
      "frequency": "Once daily"
    },
    {
      "name": "Metformin",
      "dosage": "1000mg",
      "quantity": 30,
      "frequency": "Twice daily"
    }
  ],
  "instructions": "Take after meals. Avoid taking on empty stomach."
}

Response:
{
  "status": "success",
  "message": "Prescription sent successfully",
  "prescription_id": 5,
  "patient_id": 3,
  "pharmacy_id": 1,
  "medicines": [...],
  "patient_location": {
    "latitude": -1.94957,
    "longitude": 30.05885
  },
  "prescription_status": "pending",
  "created_at": "2026-02-25T10:30:15.123Z"
}
```

#### 3. Get All Doctor's Prescriptions (with status)
```http
GET /api/prescription/my-prescriptions
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "status": "success",
  "total": 5,
  "prescriptions": [
    {
      "prescription_id": 5,
      "status": "pending",
      "created_at": "2026-02-25T10:30:15.123Z",
      "approved_at": null,
      "delivered_at": null,
      "medicines": [...],
      "instructions": "...",
      "patient": {
        "name": "John Doe",
        "age": 45,
        "phone": "+250-123-456-789",
        "location": {
          "latitude": -1.94957,
          "longitude": 30.05885
        }
      },
      "pharmacy": {
        "name": "Central Pharmacy",
        "phone": "+250-789-456-123",
        "location": {
          "latitude": -1.9536,
          "longitude": 30.0605
        }
      }
    }
  ]
}
```

#### 4. Check Single Prescription Status
```http
GET /api/prescription/prescription/:prescription_id/status
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "status": "success",
  "prescription": {
    "prescription_id": 5,
    "patient_name": "John Doe",
    "pharmacy_name": "Central Pharmacy",
    "medicines": [...],
    "instructions": "...",
    "prescription_status": "approved",
    "created_at": "2026-02-25T10:30:15.123Z",
    "approved_at": "2026-02-25T11:15:00.456Z",
    "delivered_at": null,
    "denied_reason": null,
    "denied_at": null
  }
}
```

---

### Pharmacy Endpoints (Requires JWT)

#### 1. Get Pending & Approved Prescriptions
```http
GET /api/prescription/pending
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "status": "success",
  "total": 3,
  "pending_count": 2,
  "prescriptions": [
    {
      "prescription_id": 5,
      "status": "pending",
      "created_at": "2026-02-25T10:30:15.123Z",
      "approved_at": null,
      "delivered_at": null,
      "medicines": [...],
      "instructions": "...",
      "doctor": {
        "name": "Dr. Eva"
      },
      "patient": {
        "name": "John Doe",
        "age": 45,
        "phone": "+250-123-456-789",
        "location": {
          "latitude": -1.94957,
          "longitude": 30.05885
        }
      }
    }
  ]
}
```

#### 2. Approve Prescription
```http
PATCH /api/prescription/prescription/:prescription_id/approve
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "status": "success",
  "message": "Prescription approved",
  "prescription_id": 5,
  "prescription_status": "approved",
  "approved_at": "2026-02-25T11:15:00.456Z"
}
```

#### 3. Deny/Reject Prescription
```http
PATCH /api/prescription/prescription/:prescription_id/deny
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Request Body:
{
  "reason": "Medicine not in stock"
}

Response:
{
  "status": "success",
  "message": "Prescription denied",
  "prescription_id": 5,
  "prescription_status": "rejected",
  "denied_at": "2026-02-25T11:20:00.789Z"
}
```

#### 4. Mark Prescription as Delivered
```http
PATCH /api/prescription/prescription/:prescription_id/deliver
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "status": "success",
  "message": "Prescription marked as delivered",
  "prescription_id": 5,
  "prescription_status": "delivered",
  "delivered_at": "2026-02-25T14:45:30.123Z"
}
```

---

## Status Workflow

```
┌─────────────────────────────────────┐
│   DOCTOR SENDS PRESCRIPTION         │
│   Status: PENDING                   │
│   created_at = NOW()                │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  PHARMACY REVIEWS PRESCRIPTION      │
│  - Check availabilty                │
│  - Can: APPROVE or DENY             │
└─────┬──────────────────────────┬────┘
      │                          │
      ▼ PHARMACY APPROVES        ▼ PHARMACY DENIES
┌──────────────────┐      ┌──────────────────┐
│ Status: APPROVED │      │ Status: REJECTED │
│ approved_at=NOW()│      │ denied_at = NOW()│
└────────┬─────────┘      └──────────────────┘
         │                       │
         ▼ PHARMACY DELIVERS     │
    ┌──────────────┐             │
    │ Status:      │             │
    │ DELIVERED    │             │
    │delivered_at= │             │
    │  NOW()       │             │
    └──────────────┘             │
                                  │
              Doctor sees all updates (real-time polling)
                        ▲
                        │
                        └────────────────────
```

---

## Database Schema

```sql
CREATE TABLE prescriptions (
  prescription_id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES users(user_id),
  patient_id INT NOT NULL REFERENCES patients(patient_id),
  pharmacy_id INT NOT NULL REFERENCES users(user_id),
  medicines JSONB NOT NULL,
  instructions TEXT,
  patient_latitude FLOAT,
  patient_longitude FLOAT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  delivered_at TIMESTAMP,
  denied_reason TEXT,
  denied_at TIMESTAMP
);
```

Status values: `'pending'`, `'approved'`, `'rejected'`, `'delivered'`

---

## Example Frontend Implementation

### Doctor Dashboard - Send Prescription Component

```javascript
// DoctorSendPrescription.jsx
import React, { useState, useEffect } from 'react';

const DoctorSendPrescription = ({ token, assignedPatient }) => {
  const [pharmacies, setPharmacies] = useState([]);
  const [formData, setFormData] = useState({
    pharmacy_id: '',
    medicines: [{ name: '', dosage: '', quantity: '', frequency: '' }],
    instructions: ''
  });

  useEffect(() => {
    fetchPharmacies();
  }, []);

  const fetchPharmacies = async () => {
    const res = await fetch('http://localhost:5000/api/prescription/pharmacies', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setPharmacies(data.pharmacies);
  };

  const handleMedicineChange = (index, field, value) => {
    const newMedicines = [...formData.medicines];
    newMedicines[index][field] = value;
    setFormData({ ...formData, medicines: newMedicines });
  };

  const addMedicine = () => {
    setFormData({
      ...formData,
      medicines: [
        ...formData.medicines,
        { name: '', dosage: '', quantity: '', frequency: '' }
      ]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('http://localhost:5000/api/prescription/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patient_id: assignedPatient.patient_id,
        pharmacy_id: parseInt(formData.pharmacy_id),
        medicines: formData.medicines,
        instructions: formData.instructions
      })
    });

    if (response.ok) {
      alert('Prescription sent successfully!');
      setFormData({
        pharmacy_id: '',
        medicines: [{ name: '', dosage: '', quantity: '', frequency: '' }],
        instructions: ''
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Select Pharmacy:</label>
        <select
          value={formData.pharmacy_id}
          onChange={(e) => setFormData({ ...formData, pharmacy_id: e.target.value })}
          required
        >
          <option value="">-- Select Pharmacy --</option>
          {pharmacies.map((ph) => (
            <option key={ph.pharmacy_id} value={ph.pharmacy_id}>
              {ph.name} - {ph.phone}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Medicines:</label>
        {formData.medicines.map((med, idx) => (
          <div key={idx}>
            <input
              placeholder="Medicine Name"
              value={med.name}
              onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
              required
            />
            <input
              placeholder="Dosage (e.g., 500mg)"
              value={med.dosage}
              onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
            />
            <input
              type="number"
              placeholder="Quantity"
              value={med.quantity}
              onChange={(e) => handleMedicineChange(idx, 'quantity', e.target.value)}
            />
            <input
              placeholder="Frequency (e.g., Once daily)"
              value={med.frequency}
              onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
            />
          </div>
        ))}
        <button type="button" onClick={addMedicine}>+ Add Medicine</button>
      </div>

      <div>
        <label>Instructions:</label>
        <textarea
          value={formData.instructions}
          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
          placeholder="e.g., Take after meals. Avoid on empty stomach."
        />
      </div>

      <button type="submit">Send Prescription</button>
    </form>
  );
};

export default DoctorSendPrescription;
```

### Doctor Dashboard - View Prescriptions with Status

```javascript
// DoctorPrescriptionsList.jsx
import React, { useState, useEffect } from 'react';

const DoctorPrescriptionsList = ({ token }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchPrescriptions();
    
    // Auto-refresh every 5 seconds if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchPrescriptions, 5000);
    }
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchPrescriptions = async () => {
    const res = await fetch('http://localhost:5000/api/prescription/my-prescriptions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setPrescriptions(data.prescriptions);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': '⏳ PENDING',
      'approved': '✓ APPROVED',
      'delivered': '✅ DELIVERED',
      'rejected': '❌ REJECTED'
    };
    return badges[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#FF9800',
      'approved': '#2196F3',
      'delivered': '#4CAF50',
      'rejected': '#F44336'
    };
    return colors[status] || '#757575';
  };

  return (
    <div>
      <h2>My Prescriptions</h2>
      
      <label>
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={(e) => setAutoRefresh(e.target.checked)}
        />
        Auto-refresh every 5 seconds
      </label>
      <button onClick={fetchPrescriptions}>Refresh Now</button>

      <div style={{ marginTop: '20px' }}>
        {prescriptions.length === 0 ? (
          <p>No prescriptions sent yet.</p>
        ) : (
          prescriptions.map((rx) => (
            <div key={rx.prescription_id} style={{
              border: '1px solid #ddd',
              padding: '15px',
              marginBottom: '15px',
              borderRadius: '8px',
              backgroundColor: '#f9f9f9'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h3>Prescription #{rx.prescription_id}</h3>
                  <p><strong>Patient:</strong> {rx.patient.name} ({rx.patient.age} years)</p>
                  <p><strong>Pharmacy:</strong> {rx.pharmacy.name}</p>
                </div>
                <div style={{
                  backgroundColor: getStatusColor(rx.status),
                  color: 'white',
                  padding: '10px 15px',
                  borderRadius: '5px',
                  textAlign: 'center',
                  minWidth: '120px'
                }}>
                  <strong>{getStatusBadge(rx.status)}</strong>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <p><strong>Medicines:</strong></p>
                <ul>
                  {rx.medicines.map((med, idx) => (
                    <li key={idx}>
                      {med.name} - {med.dosage} (Qty: {med.quantity})
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                <p>Sent: {new Date(rx.created_at).toLocaleString()}</p>
                {rx.approved_at && (
                  <p>✓ Approved: {new Date(rx.approved_at).toLocaleString()}</p>
                )}
                {rx.delivered_at && (
                  <p>✅ Delivered: {new Date(rx.delivered_at).toLocaleString()}</p>
                )}
                {rx.denied_at && (
                  <p>❌ Rejected: {new Date(rx.denied_at).toLocaleString()}
                    {rx.denied_reason && ` - Reason: ${rx.denied_reason}`}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DoctorPrescriptionsList;
```

### Pharmacy Dashboard - Manage Prescriptions

```javascript
// PharmacyPrescriptionsManager.jsx
import React, { useState, useEffect } from 'react';

const PharmacyPrescriptionsManager = ({ token }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPendingPrescriptions();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchPendingPrescriptions, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingPrescriptions = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/prescription/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPrescriptions(data.prescriptions);
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
    }
  };

  const approvePrescription = async (prescriptionId) => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/prescription/prescription/${prescriptionId}/approve`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (res.ok) {
        alert('Prescription approved!');
        fetchPendingPrescriptions();
      }
    } catch (err) {
      console.error('Error approving prescription:', err);
    }
    setLoading(false);
  };

  const denyPrescription = async (prescriptionId) => {
    const reason = prompt('Reason for denial:');
    if (!reason) return;

    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/prescription/prescription/${prescriptionId}/deny`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason })
        }
      );
      if (res.ok) {
        alert('Prescription denied!');
        fetchPendingPrescriptions();
      }
    } catch (err) {
      console.error('Error denying prescription:', err);
    }
    setLoading(false);
  };

  const deliverPrescription = async (prescriptionId) => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/prescription/prescription/${prescriptionId}/deliver`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (res.ok) {
        alert('Prescription marked as delivered!');
        fetchPendingPrescriptions();
      }
    } catch (err) {
      console.error('Error delivering prescription:', err);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#FF9800',
      'approved': '#2196F3',
      'delivered': '#4CAF50'
    };
    return colors[status] || '#757575';
  };

  // Group by status
  const pending = prescriptions.filter(p => p.status === 'pending');
  const approved = prescriptions.filter(p => p.status === 'approved');

  return (
    <div>
      <h2>Prescription Management</h2>
      <p>Total: {pending.length} Pending | {approved.length} Approved</p>

      <h3>⏳ Pending Prescriptions</h3>
      <div>
        {pending.length === 0 ? (
          <p>No pending prescriptions.</p>
        ) : (
          pending.map((rx) => (
            <div key={rx.prescription_id} style={{
              border: '1px solid #FF9800',
              padding: '15px',
              marginBottom: '15px',
              borderRadius: '8px',
              backgroundColor: '#FFF3E0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h3>Rx #{rx.prescription_id}</h3>
                  <p><strong>Doctor:</strong> {rx.doctor.name}</p>
                  <p><strong>Patient:</strong> {rx.patient.name} ({rx.patient.age}yo)</p>
                  <p><strong>Location:</strong> {rx.patient.location.latitude.toFixed(4)}, {rx.patient.location.longitude.toFixed(4)}</p>
                </div>
                <div>
                  <p style={{ color: '#FF9800', fontWeight: 'bold' }}>⏳ PENDING</p>
                  <p><small>{new Date(rx.created_at).toLocaleString()}</small></p>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <p><strong>Medicines Requested:</strong></p>
                <ul>
                  {rx.medicines.map((med, idx) => (
                    <li key={idx}>
                      {med.name} - {med.dosage} (Qty: {med.quantity}, {med.frequency})
                    </li>
                  ))}
                </ul>
                {rx.instructions && (
                  <p><strong>Instructions:</strong> {rx.instructions}</p>
                )}
              </div>

              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => approvePrescription(rx.prescription_id)}
                  disabled={loading}
                  style={{ backgroundColor: '#4CAF50', color: 'white', padding: '10px 20px' }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => denyPrescription(rx.prescription_id)}
                  disabled={loading}
                  style={{ backgroundColor: '#F44336', color: 'white', padding: '10px 20px' }}
                >
                  ✗ Deny
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <h3>✓ Approved Prescriptions (Ready to Deliver)</h3>
      <div>
        {approved.length === 0 ? (
          <p>No approved prescriptions.</p>
        ) : (
          approved.map((rx) => (
            <div key={rx.prescription_id} style={{
              border: '1px solid #2196F3',
              padding: '15px',
              marginBottom: '15px',
              borderRadius: '8px',
              backgroundColor: '#E3F2FD'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h3>Rx #{rx.prescription_id}</h3>
                  <p><strong>Patient:</strong> {rx.patient.name}</p>
                  <p><strong>Approved:</strong> {new Date(rx.approved_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => deliverPrescription(rx.prescription_id)}
                  disabled={loading}
                  style={{ backgroundColor: '#4CAF50', color: 'white', padding: '10px 20px', height: 'fit-content' }}
                >
                  ✅ Mark Delivered
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PharmacyPrescriptionsManager;
```

---

## Testing the API

Use this curl command to test:

```bash
# Get JWT token first (from login)
TOKEN="your_jwt_token_here"

# Send prescription
curl -X POST http://localhost:5000/api/prescription/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 3,
    "pharmacy_id": 1,
    "medicines": [{"name": "Aspirin", "dosage": "500mg", "quantity": 10}],
    "instructions": "Take after meals"
  }'

# Get doctor prescriptions
curl -X GET http://localhost:5000/api/prescription/my-prescriptions \
  -H "Authorization: Bearer $TOKEN"

# Approve (pharmacy endpoint)
curl -X PATCH http://localhost:5000/api/prescription/prescription/5/approve \
  -H "Authorization: Bearer $TOKEN"

# Deliver
curl -X PATCH http://localhost:5000/api/prescription/prescription/5/deliver \
  -H "Authorization: Bearer $TOKEN"
```
