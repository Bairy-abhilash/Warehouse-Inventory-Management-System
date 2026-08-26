"""Dashboard and report routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.dashboard import DashboardResponse, ReportResponse
from app.services.dashboard_service import get_dashboard, get_reports

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/stats", response_model=DashboardResponse)
def dashboard_stats(db: Session = Depends(get_db)):
    return get_dashboard(db)


@router.get("/reports", response_model=ReportResponse)
def reports(db: Session = Depends(get_db)):
    return get_reports(db)
