import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const PiedDePage = () => {
  return (
    <>
      <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">
              Gendarmerie Nationale
            </h3>
            <p className="text-sm">
              Système de gestion des fiches criminelles et de suivi biométrique
              pour assurer la sécurité et l'ordre public.
            </p>
          </div>

          <div>
            <h3 className="text-white font-bold text-lg mb-4">Contact</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Phone size={16} />
                <span className="text-sm">+213 XX XX XX XX</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail size={16} />
                <span className="text-sm">contact@gendarmerie.dz</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin size={16} />
                <span className="text-sm">Antananarivo, Madagascar</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white font-bold text-lg mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/aide" className="hover:text-white transition-colors">
                  Centre d'aide
                </a>
              </li>
              <li>
                <a href="/documentation" className="hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm">
          <p>
            © {new Date().getFullYear()} Gendarmerie Nationale. Tous droits réservés.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Système confidentiel - Accès réservé au personnel autorisé
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Version 1.0
          </p>
        </div>
      </div>
    </footer>
    </>
  );
};

export default PiedDePage;

