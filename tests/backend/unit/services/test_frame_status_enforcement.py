"""Tests for reviewer/approver enforcement on status transitions."""
import pytest
from app.models.frame import FrameType, FrameStatus
from app.services.frame_service import FrameService


@pytest.fixture
def frame_service(tmp_path):
    service = FrameService(data_path=tmp_path)
    (tmp_path / "frames").mkdir(parents=True, exist_ok=True)
    return service


def test_transition_to_in_review_requires_reviewer(frame_service):
    frame = frame_service.create_frame(FrameType.FEATURE, "owner1")
    with pytest.raises(ValueError, match="reviewer"):
        frame_service.update_frame_status(frame.id, FrameStatus.IN_REVIEW)


def test_transition_to_in_review_with_reviewer_succeeds(frame_service):
    frame = frame_service.create_frame(FrameType.FEATURE, "owner1")
    frame_service.update_frame_meta(frame.id, reviewer="reviewer1")
    result = frame_service.update_frame_status(frame.id, FrameStatus.IN_REVIEW)
    assert result.status == FrameStatus.IN_REVIEW


def test_transition_to_ready_requires_approver(frame_service):
    frame = frame_service.create_frame(FrameType.FEATURE, "owner1")
    frame_service.update_frame_meta(frame.id, reviewer="reviewer1")
    frame_service.update_frame_status(frame.id, FrameStatus.IN_REVIEW)
    with pytest.raises(ValueError, match="approver"):
        frame_service.update_frame_status(frame.id, FrameStatus.READY)


def test_transition_to_ready_with_approver_succeeds(frame_service):
    frame = frame_service.create_frame(FrameType.FEATURE, "owner1")
    frame_service.update_frame_meta(frame.id, reviewer="reviewer1", approver="approver1")
    frame_service.update_frame_status(frame.id, FrameStatus.IN_REVIEW)
    result = frame_service.update_frame_status(frame.id, FrameStatus.READY)
    assert result.status == FrameStatus.READY


def test_update_frame_meta_sets_reviewer(frame_service):
    frame = frame_service.create_frame(FrameType.BUG, "owner1")
    result = frame_service.update_frame_meta(frame.id, reviewer="rev1")
    assert result.meta.reviewer == "rev1"


def test_update_frame_meta_sets_approver(frame_service):
    frame = frame_service.create_frame(FrameType.BUG, "owner1")
    result = frame_service.update_frame_meta(frame.id, approver="app1")
    assert result.meta.approver == "app1"
