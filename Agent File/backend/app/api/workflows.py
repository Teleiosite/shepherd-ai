"""Workflows API routes."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.workflow import WorkflowStep
from app.models.user import User
from app.dependencies import get_current_active_user
from pydantic import BaseModel, UUID4

router = APIRouter()


class WorkflowStepCreate(BaseModel):
    category: str
    day: int
    title: str
    prompt: str


class WorkflowStepResponse(BaseModel):
    id: UUID4
    organization_id: UUID4
    category: str
    day: int
    title: str
    prompt: str
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[WorkflowStepResponse])
async def list_workflow_steps(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List workflow steps."""
    query = db.query(WorkflowStep).filter(WorkflowStep.organization_id == current_user.organization_id)
    
    if category:
        query = query.filter(WorkflowStep.category == category)
        
    steps = query.order_by(WorkflowStep.category, WorkflowStep.day).all()
    return [WorkflowStepResponse.model_validate(s) for s in steps]


@router.post("/", response_model=WorkflowStepResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow_step(
    step_data: WorkflowStepCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new workflow step."""
    # Check for duplicate day in category
    existing = db.query(WorkflowStep).filter(
        WorkflowStep.organization_id == current_user.organization_id,
        WorkflowStep.category == step_data.category,
        WorkflowStep.day == step_data.day
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Workflow step for day {step_data.day} in category '{step_data.category}' already exists"
        )
        
    new_step = WorkflowStep(
        **step_data.model_dump(),
        organization_id=current_user.organization_id
    )
    
    db.add(new_step)
    db.commit()
    db.refresh(new_step)
    
    return WorkflowStepResponse.model_validate(new_step)


@router.delete("/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow_step(
    step_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a workflow step."""
    step = db.query(WorkflowStep).filter(
        WorkflowStep.id == step_id,
        WorkflowStep.organization_id == current_user.organization_id
    ).first()
    
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow step not found"
        )
        
    db.delete(step)
    db.commit()
    return None


@router.post("/execute", response_model=dict)
async def execute_workflows(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Manually trigger workflow execution (for testing)."""
    from app.services.workflow_service import process_daily_workflows
    
    count = await process_daily_workflows(db)
    return {"message": f"Processed workflows for {count} contacts"}
