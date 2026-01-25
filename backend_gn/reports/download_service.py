import logging
import os
import zipfile
import json
from io import BytesIO
from django.http import HttpResponse
from django.conf import settings
from criminel.models import CriminalFicheCriminelle
from enquete.models import Enquete, Preuve, RapportEnquete, Observation

logger = logging.getLogger(__name__)


class EnqueteDownloadService:
    
    @staticmethod
    def get_enquete_for_criminel(criminel):
        try:
            enquete = None
            if hasattr(criminel, 'enquetes'):
                try:
                    enquete = criminel.enquetes.order_by('-date_enregistrement').first()
                except Exception as rel_error:
                    logger.warning(f"Erreur avec relation inverse: {rel_error}, utilisation de filter")
                    enquete = None
            
            if not enquete:
                try:
                    enquete = Enquete.objects.filter(
                        dossier=criminel
                    ).order_by('-date_enregistrement').first()
                except Exception as filter_error:
                    error_msg = str(filter_error)
                    if 'n\'existe pas' in error_msg or 'does not exist' in error_msg.lower():
                        logger.warning(f"Table enquête non disponible dans la base de données: {error_msg}")
                    else:
                        logger.error(f"Erreur lors de la recherche de l'enquête: {filter_error}", exc_info=True)
                    return None
            
            if enquete:
                logger.info(f"Enquête trouvée: ID={enquete.id}, Numéro={enquete.numero_enquete} pour criminel {criminel.id}")
            else:
                logger.info(f"Aucune enquête trouvée pour criminel {criminel.id}")
            
            return enquete
        except Exception as e:
            error_msg = str(e)
            if 'n\'existe pas' in error_msg or 'does not exist' in error_msg.lower():
                logger.warning(f"Table enquête non disponible: {error_msg}")
            else:
                logger.error(f"Erreur lors de la recherche de l'enquête pour criminel {criminel.id}: {e}", exc_info=True)
            return None
    
    @staticmethod
    def verify_user_permissions(user, criminel, enquete):
        if not user.is_authenticated:
            return False, "Authentification requise"
        
        try:
            from enquete.views import _user_can_supervise, _get_assignment
            
            if _user_can_supervise(user) or user.is_superuser:
                logger.info(f"Accès autorisé pour superviseur/superuser: {user.username}")
                return True, None
            
            try:
                _get_assignment(
                    user,
                    criminel,
                    require_confirmed=False,
                    allow_supervisor_override=True
                )
                logger.info(f"Accès autorisé pour utilisateur assigné: {user.username}")
                return True, None
            except Exception as e:
                logger.warning(f"Accès refusé pour utilisateur {user.username}: {e}")
                return False, "Vous n'avez pas accès à cette enquête"
                
        except Exception as e:
            logger.error(f"Erreur lors de la vérification des permissions: {e}", exc_info=True)
            return False, "Erreur lors de la vérification des permissions"
    
    @staticmethod
    def create_enquete_archive(criminel, enquete, pdf_content, request):
        zip_buffer = BytesIO()
        
        try:
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                logger.info(f"Création archive ZIP pour enquête {enquete.id} et criminel {criminel.id}")
                
                numero = str(criminel.numero_fiche) if criminel.numero_fiche else f"ID{criminel.id}"
                nom = str(criminel.nom) if criminel.nom else "Sans_Nom"
                prenom = str(criminel.prenom) if criminel.prenom else "Sans_Prenom"
                
                fiche_filename = f'fiche_{criminel.id}_{numero}_{nom}_{prenom}.pdf'
                fiche_filename = fiche_filename.replace('/', '_').replace('\\', '_').replace(':', '_')
                zip_path_fiche = f"enquete_{enquete.id}/fiche_criminelle/{fiche_filename}"
                zip_file.writestr(zip_path_fiche, pdf_content)
                logger.info(f"✓ Fiche criminelle PDF ajoutée: {zip_path_fiche} ({len(pdf_content)} bytes)")
                
                preuves_count = EnqueteDownloadService._add_preuves(zip_file, criminel, enquete.id)
                rapports_count = EnqueteDownloadService._add_rapports(zip_file, criminel, enquete.id)
                observations_count = EnqueteDownloadService._add_observations(zip_file, criminel, enquete.id)
                
                EnqueteDownloadService._add_enquete_data_json(zip_file, enquete, criminel, preuves_count, rapports_count, observations_count)
                EnqueteDownloadService._add_readme(zip_file, enquete, criminel, preuves_count, rapports_count, observations_count)
            
            zip_buffer.seek(0)
            
            with zipfile.ZipFile(zip_buffer, 'r') as test_zip:
                file_list = test_zip.namelist()
                logger.info(f"✓✓✓ Archive ZIP créée avec succès ({len(file_list)} fichiers)")
                for file_name in sorted(file_list):
                    file_info = test_zip.getinfo(file_name)
                    logger.info(f"  ✓ {file_name} ({file_info.file_size} bytes)")
            
            zip_buffer.seek(0)
            return zip_buffer
            
        except Exception as e:
            logger.error(f"Erreur lors de la création de l'archive ZIP: {e}", exc_info=True)
            raise
    
    @staticmethod
    def _add_preuves(zip_file, criminel, enquete_id):
        preuves_count = 0
        try:
            preuves = Preuve.objects.filter(dossier=criminel)
            logger.info(f"Traitement de {preuves.count()} preuve(s)")
            
            for preuve in preuves:
                if preuve.fichier:
                    try:
                        file_path = preuve.fichier.path
                        if os.path.exists(file_path):
                            file_name = os.path.basename(preuve.fichier.name)
                            safe_file_name = file_name.replace('/', '_').replace('\\', '_').replace(':', '_')
                            zip_path = f"enquete_{enquete_id}/fiche_criminelle/pieces_jointes/preuves/{safe_file_name}"
                            zip_file.write(file_path, zip_path)
                            preuves_count += 1
                            logger.info(f"  ✓ Preuve {preuve.id} ajoutée: {safe_file_name}")
                        else:
                            logger.warning(f"  ⚠ Fichier preuve {preuve.id} introuvable: {file_path}")
                    except Exception as e:
                        logger.warning(f"  ⚠ Impossible d'ajouter la preuve {preuve.id}: {e}")
        except Exception as e:
            logger.error(f"Erreur lors de l'ajout des preuves: {e}", exc_info=True)
        
        return preuves_count
    
    @staticmethod
    def _add_rapports(zip_file, criminel, enquete_id):
        rapports_count = 0
        try:
            rapports = RapportEnquete.objects.filter(dossier=criminel)
            logger.info(f"Traitement de {rapports.count()} rapport(s)")
            
            for rapport in rapports:
                try:
                    safe_titre = str(rapport.titre).replace('/', '_').replace('\\', '_').replace(':', '_')[:100]
                    rapport_filename = f"rapport_{rapport.id}_{safe_titre}.txt"
                    
                    rapport_content = f"""RAPPORT D'ENQUÊTE
{'=' * 50}

ID: {rapport.id}
Titre: {rapport.titre}
Statut: {rapport.get_statut_display() if hasattr(rapport, 'get_statut_display') else rapport.statut}
Date de rédaction: {rapport.date_redaction.strftime('%d/%m/%Y %H:%M') if rapport.date_redaction else 'N/A'}
Enquêteur: {rapport.enqueteur.get_full_name() if rapport.enqueteur and hasattr(rapport.enqueteur, 'get_full_name') else (rapport.enqueteur.username if rapport.enqueteur else 'Non assigné')}

{'=' * 50}

CONTENU:
{rapport.contenu}

{'=' * 50}
"""
                    zip_path = f"enquete_{enquete_id}/fiche_criminelle/pieces_jointes/rapports/{rapport_filename}"
                    zip_file.writestr(zip_path, rapport_content.encode('utf-8'))
                    rapports_count += 1
                    logger.info(f"  ✓ Rapport {rapport.id} ajouté: {rapport_filename}")
                except Exception as e:
                    logger.warning(f"  ⚠ Impossible d'ajouter le rapport {rapport.id}: {e}")
        except Exception as e:
            logger.error(f"Erreur lors de l'ajout des rapports: {e}", exc_info=True)
        
        return rapports_count
    
    @staticmethod
    def _add_observations(zip_file, criminel, enquete_id):
        observations_count = 0
        try:
            observations = Observation.objects.filter(dossier=criminel)
            logger.info(f"Traitement de {observations.count()} observation(s)")
            
            for observation in observations:
                try:
                    date_str = observation.date.strftime('%Y%m%d_%H%M%S') if observation.date else 'sans_date'
                    observation_filename = f"observation_{observation.id}_{date_str}.txt"
                    
                    observation_content = f"""OBSERVATION D'ENQUÊTE
{'=' * 50}

ID: {observation.id}
Date: {observation.date.strftime('%d/%m/%Y %H:%M') if observation.date else 'N/A'}
Enquêteur: {observation.enqueteur.get_full_name() if observation.enqueteur and hasattr(observation.enqueteur, 'get_full_name') else (observation.enqueteur.username if observation.enqueteur else 'Non assigné')}

{'=' * 50}

TEXTE:
{observation.texte}

{'=' * 50}
"""
                    zip_path = f"enquete_{enquete_id}/fiche_criminelle/pieces_jointes/observations/{observation_filename}"
                    zip_file.writestr(zip_path, observation_content.encode('utf-8'))
                    observations_count += 1
                    logger.info(f"  ✓ Observation {observation.id} ajoutée: {observation_filename}")
                except Exception as e:
                    logger.warning(f"  ⚠ Impossible d'ajouter l'observation {observation.id}: {e}")
        except Exception as e:
            logger.error(f"Erreur lors de l'ajout des observations: {e}", exc_info=True)
        
        return observations_count
    
    @staticmethod
    def _add_enquete_data_json(zip_file, enquete, criminel, preuves_count, rapports_count, observations_count):
        try:
            enquete_data = {
                'id': enquete.id,
                'numero_enquete': str(enquete.numero_enquete) if enquete.numero_enquete else None,
                'type_enquete': enquete.get_type_enquete_code_display() if hasattr(enquete, 'get_type_enquete_code_display') else str(enquete.type_enquete_code) if enquete.type_enquete_code else None,
                'titre': str(enquete.titre) if enquete.titre else '',
                'description': str(enquete.description) if enquete.description else '',
                'lieu': str(enquete.lieu) if enquete.lieu else None,
                'date_incident': enquete.date_incident.isoformat() if enquete.date_incident else None,
                'date_enregistrement': enquete.date_enregistrement.isoformat() if enquete.date_enregistrement else None,
                'statut': enquete.get_statut_display() if hasattr(enquete, 'get_statut_display') else str(enquete.statut) if enquete.statut else None,
                'priorite': enquete.get_priorite_display() if hasattr(enquete, 'get_priorite_display') else str(enquete.priorite) if enquete.priorite else None,
                'enqueteur_principal': {
                    'id': enquete.enqueteur_principal.id if enquete.enqueteur_principal else None,
                    'nom': enquete.enqueteur_principal.get_full_name() if enquete.enqueteur_principal and hasattr(enquete.enqueteur_principal, 'get_full_name') else (enquete.enqueteur_principal.username if enquete.enqueteur_principal else None),
                } if enquete.enqueteur_principal else None,
                'notes': str(enquete.notes) if enquete.notes else None,
                'statistiques': {
                    'preuves': preuves_count,
                    'rapports': rapports_count,
                    'observations': observations_count,
                }
            }
            
            enquete_json = json.dumps(enquete_data, ensure_ascii=False, indent=2, default=str)
            zip_path = f"enquete_{enquete.id}/donnees_enquete.json"
            zip_file.writestr(zip_path, enquete_json.encode('utf-8'))
            logger.info(f"✓ Données enquête JSON ajoutées: {zip_path}")
        except Exception as e:
            logger.error(f"Erreur lors de l'ajout des données JSON: {e}", exc_info=True)
    
    @staticmethod
    def _add_readme(zip_file, enquete, criminel, preuves_count, rapports_count, observations_count):
        try:
            readme_content = f"""DOSSIER D'ENQUÊTE - RÉCAPITULATIF
{'=' * 60}

ENQUÊTE:
  Numéro: {enquete.numero_enquete}
  Type: {enquete.get_type_enquete_code_display() if hasattr(enquete, 'get_type_enquete_code_display') else enquete.type_enquete_code}
  Titre: {enquete.titre}
  Statut: {enquete.get_statut_display() if hasattr(enquete, 'get_statut_display') else enquete.statut}
  Priorité: {enquete.get_priorite_display() if hasattr(enquete, 'get_priorite_display') else enquete.priorite}

  Date d'enregistrement: {enquete.date_enregistrement.strftime('%d/%m/%Y %H:%M') if enquete.date_enregistrement else 'N/A'}
  Date de l'incident: {enquete.date_incident.strftime('%d/%m/%Y %H:%M') if enquete.date_incident else 'N/A'}
  Lieu: {enquete.lieu or 'Non spécifié'}

  Enquêteur principal: {enquete.enqueteur_principal.get_full_name() if enquete.enqueteur_principal and hasattr(enquete.enqueteur_principal, 'get_full_name') else (enquete.enqueteur_principal.username if enquete.enqueteur_principal else 'Non assigné')}

FICHE CRIMINELLE:
  ID: {criminel.id}
  Numéro: {criminel.numero_fiche or 'N/A'}
  Nom: {criminel.nom or 'N/A'} {criminel.prenom or ''}

DESCRIPTION:
{enquete.description or 'Aucune description'}

NOTES:
{enquete.notes or 'Aucune note'}

{'=' * 60}

CONTENU DE L'ARCHIVE:
  - fiche_criminelle/fiche_<id>.pdf : Fiche criminelle complète
  - fiche_criminelle/pieces_jointes/preuves/ : {preuves_count} fichier(s) de preuve
  - fiche_criminelle/pieces_jointes/rapports/ : {rapports_count} rapport(s)
  - fiche_criminelle/pieces_jointes/observations/ : {observations_count} observation(s)
  - donnees_enquete.json : Données complètes de l'enquête au format JSON

{'=' * 60}

RÈGLE MÉTIER:
Chaque téléchargement inclut systématiquement le dossier complet
de l'enquête associée, conformément aux exigences judiciaires.
Aucun fichier ne peut être téléchargé hors de son contexte légal.

{'=' * 60}
"""
            zip_path = f"enquete_{enquete.id}/README.txt"
            zip_file.writestr(zip_path, readme_content.encode('utf-8'))
            logger.info(f"✓ README ajouté: {zip_path}")
        except Exception as e:
            logger.warning(f"Erreur lors de la création du README: {e}")
    
    @staticmethod
    def download_fiche_criminelle_with_enquete(criminel_id, pdf_content, request):
        try:
            try:
                criminel = CriminalFicheCriminelle.objects.select_related().prefetch_related().get(id=criminel_id)
                criminel.refresh_from_db()
            except CriminalFicheCriminelle.DoesNotExist:
                logger.error(f"Fiche criminelle {criminel_id} introuvable")
                return HttpResponse(
                    json.dumps({'erreur': 'Fiche criminelle introuvable'}),
                    content_type='application/json',
                    status=404
                )
            
            enquete = EnqueteDownloadService.get_enquete_for_criminel(criminel)
            
            if enquete:
                has_access, error_message = EnqueteDownloadService.verify_user_permissions(
                    request.user, criminel, enquete
                )
                if not has_access:
                    logger.warning(f"Accès refusé pour utilisateur {request.user.username}: {error_message}")
                    return HttpResponse(
                        json.dumps({'erreur': error_message or 'Accès refusé'}),
                        content_type='application/json',
                        status=403
                    )
            
            if enquete:
                logger.info(f"Création archive ZIP complète pour enquête {enquete.id}")
                zip_buffer = EnqueteDownloadService.create_enquete_archive(
                    criminel, enquete, pdf_content, request
                )
                
                zip_filename = f"enquete_{enquete.id}_fiche_criminelle.zip"
                response = HttpResponse(
                    content=zip_buffer.getvalue(),
                    content_type='application/zip',
                    status=200
                )
                response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
                response['Content-Length'] = str(len(zip_buffer.getvalue()))
                
                logger.info(f"✓ Archive ZIP prête: {zip_filename} ({len(zip_buffer.getvalue())} bytes)")
                return response
            else:
                logger.warning(f"Aucune enquête trouvée pour criminel {criminel_id}, retour du PDF seul")
                numero = str(criminel.numero_fiche) if criminel.numero_fiche else f"ID{criminel.id}"
                nom = str(criminel.nom) if criminel.nom else "Sans_Nom"
                prenom = str(criminel.prenom) if criminel.prenom else "Sans_Prenom"
                
                pdf_filename = f'Fiche_Criminelle_V2_{numero}_{nom}_{prenom}.pdf'
                pdf_filename = pdf_filename.replace('/', '_').replace('\\', '_').replace(':', '_')
                
                import urllib.parse
                encoded_filename = urllib.parse.quote(pdf_filename.encode('utf-8'))
                
                response = HttpResponse(
                    content=pdf_content,
                    content_type='application/pdf',
                    status=200
                )
                response['Content-Disposition'] = f'attachment; filename="{encoded_filename}"; filename*=UTF-8\'\'{encoded_filename}'
                response['Content-Length'] = str(len(pdf_content))
                return response
                
        except Exception as e:
            logger.error(f"Erreur lors du téléchargement: {e}", exc_info=True)
            import traceback
            return HttpResponse(
                json.dumps({
                    'erreur': 'Erreur lors du téléchargement',
                    'message': str(e),
                    'traceback': traceback.format_exc() if settings.DEBUG else None
                }),
                content_type='application/json',
                status=500
            )
