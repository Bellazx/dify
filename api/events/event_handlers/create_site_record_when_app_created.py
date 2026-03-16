from events.app_event import app_was_created
from extensions.ext_database import db
from models.model import Site
from constants.languages import languages


@app_was_created.connect
def handle(sender, **kwargs):
    """Create site record when an app is created."""
    app = sender
    account = kwargs.get("account")
    if account is not None:
        # Use account's interface_language if available, otherwise use default language
        default_language = account.interface_language or languages[0]
        
        site = Site(
            app_id=app.id,
            title=app.name,
            icon_type=app.icon_type,
            icon=app.icon,
            icon_background=app.icon_background,
            default_language=default_language,
            customize_token_strategy="not_allow",
            code=Site.generate_code(16),
            created_by=app.created_by,
            updated_by=app.updated_by,
        )

        db.session.add(site)
        db.session.commit()
