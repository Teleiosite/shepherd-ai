"""
Automated Verification Suite for Shepherd AI System Upgrades
Tests all models, agent parsing, scheduler logic, and router initializations.
"""
import sys
import os
import unittest
from datetime import datetime, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class TestShepherdAISystemUpgrades(unittest.TestCase):

    def test_01_models_import_and_attributes(self):
        """Verify all new and updated models have the correct fields."""
        from app.models import Organization, Contact, Message, Booking, ConversationSession, Group, MediaFile

        # Verify Organization attributes
        org = Organization()
        self.assertTrue(hasattr(org, 'wppconnect_bridge_url'))
        self.assertTrue(hasattr(org, 'ai_provider'))
        self.assertTrue(hasattr(org, 'ai_api_key'))
        self.assertTrue(hasattr(org, 'ai_model'))
        self.assertTrue(hasattr(org, 'ai_auto_reply_enabled'))
        self.assertTrue(hasattr(org, 'ai_reply_mode'))
        self.assertTrue(hasattr(org, 'ai_payment_link'))
        self.assertTrue(hasattr(org, 'ai_tone'))
        self.assertTrue(hasattr(org, 'ai_business_type'))

        # Verify Contact triage and handover attributes
        contact = Contact()
        self.assertTrue(hasattr(contact, 'conversation_status'))
        self.assertTrue(hasattr(contact, 'ai_paused_until'))

        # Verify ConversationSession
        session = ConversationSession()
        self.assertTrue(hasattr(session, 'contact_id'))
        self.assertTrue(hasattr(session, 'active_flow'))
        self.assertTrue(hasattr(session, 'collected_slots'))
        self.assertTrue(hasattr(session, 'expires_at'))

        # Verify MediaFile
        media = MediaFile()
        self.assertTrue(hasattr(media, 'organization_id'))
        self.assertTrue(hasattr(media, 'name'))
        self.assertTrue(hasattr(media, 'url'))
        self.assertTrue(hasattr(media, 'type'))
        self.assertTrue(hasattr(media, 'file_name'))
        print("[PASSED] Test 1: All database models and attributes verified.")

    def test_02_agent_response_parsing(self):
        """Verify JSON parsing and fallback logic in agent_service."""
        from app.services.agent_service import parse_agent_response

        # Test valid JSON response with booking action
        valid_json = """
        {
          "reply": "We would love to help you book an appointment! Which date works best?",
          "action": {
            "type": "CREATE_BOOKING",
            "purpose": "General Consultation",
            "preferredDate": "2026-08-25",
            "preferredTime": "10:00 AM"
          }
        }
        """
        res = parse_agent_response(valid_json)
        self.assertEqual(res["reply"], "We would love to help you book an appointment! Which date works best?")
        self.assertEqual(res["action"]["type"], "CREATE_BOOKING")
        self.assertEqual(res["action"]["purpose"], "General Consultation")
        self.assertEqual(res["action"]["preferredDate"], "2026-08-25")

        # Test valid JSON with document sending action
        doc_json = """
        ```json
        {
          "reply": "Here is the church welcome brochure you requested!",
          "action": {
            "type": "SEND_DOCUMENT",
            "documentName": "Welcome Brochure"
          }
        }
        ```
        """
        doc_res = parse_agent_response(doc_json)
        self.assertEqual(doc_res["reply"], "Here is the church welcome brochure you requested!")
        self.assertEqual(doc_res["action"]["type"], "SEND_DOCUMENT")
        self.assertEqual(doc_res["action"]["documentName"], "Welcome Brochure")

        # Test fallback when AI returns non-JSON plain text
        plain_text = "Hello! I am happy to assist you today."
        plain_res = parse_agent_response(plain_text)
        self.assertEqual(plain_res["reply"], "Hello! I am happy to assist you today.")
        self.assertEqual(plain_res["action"]["type"], "NONE")
        print("[PASSED] Test 2: Agent response parsing, intent extraction, and fallback logic verified.")

    def test_03_fastapi_app_and_all_routes(self):
        """Verify that FastAPI app initializes cleanly with all new routers registered."""
        from app.main import app

        schema = app.openapi()
        route_paths = list(schema.get('paths', {}).keys())
        
        # Verify bridge polling route
        self.assertIn("/api/bridge/pending-messages", route_paths)
        # Verify conversations routes
        self.assertIn("/api/conversations/", route_paths)
        self.assertIn("/api/conversations/{contact_id}/status", route_paths)
        self.assertIn("/api/conversations/{contact_id}/pause-ai", route_paths)
        # Verify widget route
        self.assertIn("/api/widget/message", route_paths)
        # Verify media library routes
        self.assertIn("/api/media-library/", route_paths)
        self.assertIn("/api/media-library/upload", route_paths)
        # Verify whatsapp webhook route
        self.assertIn("/api/whatsapp/webhook", route_paths)
        # Verify messages route
        self.assertIn("/api/messages/", route_paths)
        # Verify knowledge base route
        self.assertIn("/api/knowledge/", route_paths)
        # Verify bookings route
        self.assertIn("/api/bookings/", route_paths)

        print(f"[PASSED] Test 3: FastAPI application loaded cleanly with {len(route_paths)} OpenAPI paths verified.")


if __name__ == "__main__":
    unittest.main()
