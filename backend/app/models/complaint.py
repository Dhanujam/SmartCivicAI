from datetime import datetime
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, field_validator

CivicCategory = Literal[
    "Roads & Infrastructure",
    "Waste Management",
    "Water Supply",
    "Electricity & Streetlights",
    "Drainage & Sewage",
    "Public Safety",
    "Traffic & Transportation",
    "Parks & Public Spaces",
    "Other",
]

CivicUrgency = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]

# Primary statuses: REQUESTED, IN_PROGRESS, COMPLETED, REJECTED
# Legacy statuses kept for backward compatibility: Pending, In Progress, Resolved, Rejected
ComplaintStatus = Literal[
    "REQUESTED",
    "IN_PROGRESS",
    "COMPLETED",
    "REJECTED",
    "MERGED",
    "Pending",
    "In Progress",
    "Resolved",
    "Rejected",
]


class AIAnalysisResult(BaseModel):
    category: CivicCategory = Field(
        description="The municipal civic category responsible for the issue"
    )
    urgency: CivicUrgency = Field(
        description="Urgency triage level: LOW, MEDIUM, HIGH, or CRITICAL"
    )
    department: str = Field(
        description="The municipal department responsible for addressing the complaint"
    )
    priority_score: int = Field(
        ge=0,
        le=100,
        description="Priority score from 0 to 100 based on severity, danger, and impact",
    )
    location: str = Field(
        description="User-provided location or extracted civic location; 'Not specified' if unmentioned",
    )
    problem_summary: str = Field(
        description="Concise factual summary of the reported civic problem"
    )
    recommended_solution: str = Field(
        description="Practical solution the civic department should implement"
    )
    resolution_steps: List[str] = Field(
        description="3 to 5 actionable step-by-step resolution tasks for civic field teams"
    )
    priority_reason: str = Field(
        description="Rationale justifying the assigned urgency and priority score"
    )
    estimated_resolution_time: str = Field(
        description="Realistic timeframe for resolving the issue (e.g., '24-48 hours', '3-5 days')"
    )

    @field_validator("resolution_steps")
    @classmethod
    def validate_steps(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("resolution_steps must contain actionable steps")
        return v


class ComplaintCreate(BaseModel):
    title: Optional[str] = None
    description: str
    citizen_name: Optional[str] = "Anonymous"
    citizen_contact: Optional[str] = None
    location_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus
    admin_notes: Optional[str] = None


class ComplaintResponse(BaseModel):
    id: str
    complaint_id: str = "CIV-2026-000000"
    citizen_id: Optional[str] = None
    description: str
    citizen_name: Optional[str] = "Anonymous"
    citizen_contact: Optional[str] = None
    location_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    status: str = "REQUESTED"
    duplicate_found: bool = False
    duplicate_complaint_ids: List[str] = []
    duplicate_details: List[Dict[str, Any]] = []
    ai_analysis: Optional[AIAnalysisResult] = None
    created_at: datetime
    updated_at: datetime
    # Stretch Goal 1: Duplicate Complaint Merging
    is_master_complaint: bool = False
    master_complaint_id: Optional[str] = None
    master_status: Optional[str] = None
    merged_complaint_ids: List[str] = []
    merged_complaints_details: List[Dict[str, Any]] = []
    merged_at: Optional[datetime] = None
    merged_by: Optional[str] = None
    # Stretch Goal 2: SLA Monitoring & Breach Alerts
    sla_hours: Optional[int] = None
    sla_due_at: Optional[datetime] = None
    sla_status: Optional[str] = "WITHIN_SLA"
    sla_breached_at: Optional[datetime] = None
    sla_remaining_seconds: Optional[int] = None
    sla_remaining_text: Optional[str] = None
    sla_completed_late: Optional[bool] = False


class ComplaintMergeRequest(BaseModel):
    duplicate_complaint_ids: List[str] = Field(
        ..., min_length=1, description="List of duplicate complaint IDs to merge into master"
    )


class ComplaintMergeResponse(BaseModel):
    success: bool
    master_complaint_id: str
    merged_complaint_ids: List[str]
    message: str
