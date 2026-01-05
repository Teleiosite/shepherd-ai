"""Workflows API routes."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.workflow import WorkflowStep
from app.models.user import User
from app.dependencies import get_current_active_user
from pydantic import BaseModel, UUID4
from io import BytesIO
import openpyxl

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


@router.post("/upload-excel", response_model=dict)
async def upload_workflow_excel(
    category: str,
    file: UploadFile = File(...),
    replace_existing: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload Excel file to create workflow steps.
    
    Excel format:
    - Column A: Day (number)
    - Column B: Title (string)
    - Column C: Goal (string)
    
    Args:
        category: Category name for these workflow steps
        file: Excel file (.xlsx or .xls)
        replace_existing: If True, delete existing steps for this category first
    """
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be .xlsx or .xls format"
        )
    
    try:
        # Read Excel file
        contents = await file.read()
        workbook = openpyxl.load_workbook(BytesIO(contents))
        sheet = workbook.active
        
        # Parse rows (skip header if present)
        steps_to_create = []
        errors = []
        
        for idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if not row or all(cell is None for cell in row):
                continue  # Skip empty rows
                
            try:
                day = row[0]
                title = row[1]
                goal = row[2] if len(row) > 2 else ""
                
                # Validate
                if day is None or title is None:
                    errors.append(f"Row {idx}: Missing day or title")
                    continue
                    
                # Convert day to int
                try:
                    day = int(day)
                except (ValueError, TypeError):
                    errors.append(f"Row {idx}: Day must be a number")
                    continue
                
                if day < 0:
                    errors.append(f"Row {idx}: Day cannot be negative")
                    continue
                    
                steps_to_create.append({
                    "day": day,
                    "title": str(title).strip(),
                    "prompt": str(goal).strip() if goal else ""
                })
                
            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")
        
        if not steps_to_create:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No valid workflow steps found in file. Errors: {'; '.join(errors)}"
            )
        
        # Replace existing if requested
        if replace_existing:
            db.query(WorkflowStep).filter(
                WorkflowStep.organization_id == current_user.organization_id,
                WorkflowStep.category == category
            ).delete()
            db.commit()
        
        # Create workflow steps
        created_count = 0
        skipped_count = 0
        
        for step_data in steps_to_create:
            # Check for duplicate
            existing = db.query(WorkflowStep).filter(
                WorkflowStep.organization_id == current_user.organization_id,
                WorkflowStep.category == category,
                WorkflowStep.day == step_data["day"]
            ).first()
            
            if existing:
                skipped_count += 1
                errors.append(f"Day {step_data['day']}: Already exists (skipped)")
                continue
            
            new_step = WorkflowStep(
                organization_id=current_user.organization_id,
                category=category,
                **step_data
            )
            db.add(new_step)
            created_count += 1
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Created {created_count} workflow steps",
            "created": created_count,
            "skipped": skipped_count,
            "errors": errors if errors else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process Excel file: {str(e)}"
        )
