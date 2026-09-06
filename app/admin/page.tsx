            {/* Social Links Section */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand-blue mb-6">Social Links & Contact</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">📧 Contact Email</label>
                  <input
                    type="email"
                    value={socials.email}
                    onChange={(e) => setSocials((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                    placeholder="contact@maggsymassagetherapy.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">📸 Instagram</label>
                  <input
                    type="text"
                    value={socials.instagram}
                    onChange={(e) => setSocials((prev) => ({ ...prev, instagram: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                    placeholder="https://instagram.com/maggsymt"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">👥 Facebook</label>
                  <input
                    type="text"
                    value={socials.facebook}
                    onChange={(e) => setSocials((prev) => ({ ...prev, facebook: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                    placeholder="https://facebook.com/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">🎵 TikTok</label>
                  <input
                    type="text"
                    value={socials.tiktok}
                    onChange={(e) => setSocials((prev) => ({ ...prev, tiktok: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                    placeholder="https://tiktok.com/..."
                  />
                </div>
              </div>

              {socialsError && <p className="text-sm text-red-600 mb-4">{socialsError}</p>}

              <button
                onClick={handleSaveSocials}
                disabled={savingSocials}
                className="w-full bg-brand-gold text-brand-blue font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-70"
              >
                {savingSocials ? "Saving..." : "Save Social Links"}
              </button>
            </div>