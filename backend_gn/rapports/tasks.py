import logging
from datetime import date, timedelta
from typing import TYPE_CHECKING

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from typing import Any, Callable
    def shared_task(*args: Any, **kwargs: Any) -> Callable[[Callable], Callable]:
        def decorator(func: Callable) -> Callable:
            return func
        return decorator
else:
    try:
        from celery import shared_task  # type: ignore[import-untyped]
        CELERY_AVAILABLE = True
    except ImportError:
        CELERY_AVAILABLE = False
        def shared_task(*args, **kwargs):  # type: ignore[misc]
            def decorator(func):
                return func
            return decorator

from .generateur import GenerateurRapport
from .models import Rapport


@shared_task(max_retries=3)
def generate_report(report_id):
    return generate_report_sync(report_id)


def generate_report_sync(report_id):
    import time
    import traceback
    
    try:
        try:
            rapport = Rapport.objects.get(id=report_id)  # type: ignore
        except Rapport.DoesNotExist:  # type: ignore
            error_msg = f"Rapport {report_id} non trouvé"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}
        
        rapport.statut = 'en_cours'
        rapport.save(update_fields=['statut'])
        
        logger.info(f"Démarrage de la génération du rapport {report_id}")
        
        start_time = time.time()
        
        generateur = GenerateurRapport(rapport)
        generateur.generer()
        
        actual_duration = time.time() - start_time
        
        logger.info(f"Rapport {report_id} généré avec succès. Durée: {actual_duration:.2f}s")
        
        return {
            'success': True,
            'rapport_id': str(rapport.id),
            'duration': actual_duration
        }
        
    except Exception as e:
        error_msg = str(e)
        error_traceback = traceback.format_exc()
        
        logger.error(f"Erreur lors de la génération du rapport {report_id}: {error_msg}")
        logger.error(error_traceback)
        
        try:
            rapport = Rapport.objects.get(id=report_id)  # type: ignore
            rapport.statut = 'erreur'
            rapport.message_erreur = error_msg[:500]
            rapport.save(update_fields=['statut', 'message_erreur'])
        except Rapport.DoesNotExist:  # type: ignore
            pass
        
        return {'success': False, 'error': error_msg}


@shared_task
def generate_automatic_reports():
    logger.info("Génération automatique des rapports désactivée")
    return {'total': 0, 'resultats': []}


@shared_task
def generate_daily_statistics_report():
    from .generateur import GenerateurRapport
    from datetime import date, timedelta
    
    logger.info("Génération du rapport statistique quotidien")
    
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    rapport = None
    try:
        rapport = Rapport.objects.create(  # type: ignore
            titre='Rapport statistique quotidien',
            type_rapport='statistique',
            parametres={
                'date_debut': yesterday.strftime('%Y-%m-%d'),
                'date_fin': yesterday.strftime('%Y-%m-%d'),
            },
            note='Rapport statistique quotidien automatique',
            statut='en_attente'
        )
        
        generateur = GenerateurRapport(rapport)
        generateur.generer()
        
        logger.info(f"Rapport statistique quotidien créé: {rapport.id}")
        return {'success': True, 'rapport_id': str(rapport.id)}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Erreur lors de la génération du rapport statistique quotidien: {error_msg}", exc_info=True)
        if rapport:
            try:
                rapport.refresh_from_db()
                rapport.statut = 'erreur'
                rapport.message_erreur = error_msg[:500]
                rapport.save(update_fields=['statut', 'message_erreur'])
            except Exception:
                pass
        return {'success': False, 'error': error_msg}


@shared_task
def generate_weekly_statistics_report():
    from .generateur import GenerateurRapport
    from datetime import date, timedelta
    
    logger.info("Génération du rapport statistique hebdomadaire")
    
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    
    rapport = None
    try:
        rapport = Rapport.objects.create(  # type: ignore
            titre='Rapport statistique hebdomadaire',
            type_rapport='statistique',
            parametres={
                'date_debut': start_of_week.strftime('%Y-%m-%d'),
                'date_fin': end_of_week.strftime('%Y-%m-%d'),
            },
            note='Rapport statistique hebdomadaire automatique',
            statut='en_attente'
        )
        
        generateur = GenerateurRapport(rapport)
        generateur.generer()
        
        logger.info(f"Rapport statistique hebdomadaire créé: {rapport.id}")
        return {'success': True, 'rapport_id': str(rapport.id)}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Erreur lors de la génération du rapport statistique hebdomadaire: {error_msg}", exc_info=True)
        if rapport:
            try:
                rapport.refresh_from_db()
                rapport.statut = 'erreur'
                rapport.message_erreur = error_msg[:500]
                rapport.save(update_fields=['statut', 'message_erreur'])
            except Exception:
                pass
        return {'success': False, 'error': error_msg}


@shared_task
def generate_monthly_statistics_report():
    from .generateur import GenerateurRapport
    from datetime import date, timedelta
    
    logger.info("Génération du rapport statistique mensuel")
    
    today = date.today()
    start_of_month = date(today.year, today.month, 1)
    if today.month == 12:
        end_of_month = date(today.year + 1, 1, 1) - timedelta(days=1)
    else:
        end_of_month = date(today.year, today.month + 1, 1) - timedelta(days=1)
    
    rapport = None
    try:
        rapport = Rapport.objects.create(  # type: ignore
            titre='Rapport statistique mensuel',
            type_rapport='statistique',
            parametres={
                'date_debut': start_of_month.strftime('%Y-%m-%d'),
                'date_fin': end_of_month.strftime('%Y-%m-%d'),
            },
            note='Rapport statistique mensuel automatique',
            statut='en_attente'
        )
        
        generateur = GenerateurRapport(rapport)
        generateur.generer()
        
        logger.info(f"Rapport statistique mensuel créé: {rapport.id}")
        return {'success': True, 'rapport_id': str(rapport.id)}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Erreur lors de la génération du rapport statistique mensuel: {error_msg}", exc_info=True)
        if rapport:
            try:
                rapport.refresh_from_db()
                rapport.statut = 'erreur'
                rapport.message_erreur = error_msg[:500]
                rapport.save(update_fields=['statut', 'message_erreur'])
            except Exception:
                pass
        return {'success': False, 'error': error_msg}


@shared_task
def generate_yearly_statistics_report():
    from .generateur import GenerateurRapport
    from datetime import date
    
    logger.info("Génération du rapport statistique annuel")
    
    today = date.today()
    start_of_year = date(today.year, 1, 1)
    end_of_year = date(today.year, 12, 31)
    
    rapport = None
    try:
        rapport = Rapport.objects.create(  # type: ignore
            titre='Rapport statistique annuel',
            type_rapport='statistique',
            parametres={
                'date_debut': start_of_year.strftime('%Y-%m-%d'),
                'date_fin': end_of_year.strftime('%Y-%m-%d'),
            },
            note='Rapport statistique annuel automatique',
            statut='en_attente'
        )
        
        generateur = GenerateurRapport(rapport)
        generateur.generer()
        
        logger.info(f"Rapport statistique annuel créé: {rapport.id}")
        return {'success': True, 'rapport_id': str(rapport.id)}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Erreur lors de la génération du rapport statistique annuel: {error_msg}", exc_info=True)
        if rapport:
            try:
                rapport.refresh_from_db()
                rapport.statut = 'erreur'
                rapport.message_erreur = error_msg[:500]
                rapport.save(update_fields=['statut', 'message_erreur'])
            except Exception:
                pass
        return {'success': False, 'error': error_msg}


@shared_task
def generate_daily_audit_report():
    from .generateur import GenerateurRapport
    from datetime import date, timedelta
    
    logger.info("Génération du rapport d'audit quotidien")
    
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    rapport = None
    try:
        rapport = Rapport.objects.create(  # type: ignore
            titre='Rapport d\'audit quotidien',
            type_rapport='audit',
            parametres={
                'date_debut': yesterday.strftime('%Y-%m-%d'),
                'date_fin': yesterday.strftime('%Y-%m-%d'),
            },
            note='Rapport d\'audit quotidien automatique',
            statut='en_attente'
        )
        
        generateur = GenerateurRapport(rapport)
        generateur.generer()
        
        logger.info(f"Rapport d'audit quotidien créé: {rapport.id}")
        return {'success': True, 'rapport_id': str(rapport.id)}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Erreur lors de la génération du rapport d'audit quotidien: {error_msg}", exc_info=True)
        if rapport:
            try:
                rapport.refresh_from_db()
                rapport.statut = 'erreur'
                rapport.message_erreur = error_msg[:500]
                rapport.save(update_fields=['statut', 'message_erreur'])
            except Exception:
                pass
        return {'success': False, 'error': error_msg}
