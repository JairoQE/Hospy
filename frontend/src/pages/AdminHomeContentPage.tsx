import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { formatApiError, parseFieldErrors } from "../api/errors";
import type { BrowseTile } from "../api/types";
import { AdminUsersToastHost, showAdminToast } from "../components/admin/AdminUsersToast";
import {
  HomeContentEditorModal,
  emptyTileForm,
  tileToForm,
  type TileFormState,
} from "../components/admin/homeContent/HomeContentEditorModal";
import { HomeContentTileCard } from "../components/admin/homeContent/HomeContentTileCard";
import { HomePreviewModal } from "../components/admin/homeContent/HomePreviewModal";
import { AdminDesignPanel } from "../components/admin/homeContent/AdminDesignPanel";
import { PrimeIcon } from "../components/PrimeIcon";
import {
  ADMIN_CONFIG_TABS,
  HOME_CONTENT_GROUPS,
  filterHomeTiles,
  reorderTiles,
  type AdminConfigTab,
  type HomeContentGroup,
  type HomeContentStatusFilter,
} from "../utils/adminHomeContentData";

export function AdminHomeContentPage() {
  const [activeTab, setActiveTab] = useState<AdminConfigTab>("tipo");
  const [tiles, setTiles] = useState<BrowseTile[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HomeContentStatusFilter>("all");

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<BrowseTile | null>(null);
  const [form, setForm] = useState<TileFormState>(emptyTileForm("tipo"));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [previewOpen, setPreviewOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const isDesignTab = activeTab === "diseno";
  const contentGroup = (isDesignTab ? "tipo" : activeTab) as HomeContentGroup;

  const load = useCallback(() => {
    if (isDesignTab) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<BrowseTile[]>(`/inicio-bloques/?group=${activeTab}`)
      .then((data) => setTiles(Array.isArray(data) ? data : []))
      .catch(() => {
        setTiles([]);
        showAdminToast("No se pudieron cargar las tarjetas.", "error");
      })
      .finally(() => setLoading(false));
  }, [activeTab, isDesignTab]);

  useEffect(() => {
    load();
    setSelected(new Set());
  }, [load]);

  const filteredTiles = useMemo(
    () => filterHomeTiles(tiles, { search, status: statusFilter }),
    [tiles, search, statusFilter],
  );

  const metrics = useMemo(() => {
    const active = tiles.filter((t) => t.is_active !== false).length;
    return { total: tiles.length, active, inactive: tiles.length - active };
  }, [tiles]);

  const closeEditor = () => {
    setEditorOpen(false);
    setEditing(null);
    setImageFile(null);
    setError("");
    setFieldErrors({});
  };

  const openCreate = () => {
    setEditorMode("create");
    setEditing(null);
    const nextOrder = tiles.length > 0 ? Math.max(...tiles.map((t) => t.order ?? 0)) + 1 : 1;
    setForm({ ...emptyTileForm(contentGroup), order: String(nextOrder) });
    setImageFile(null);
    setError("");
    setFieldErrors({});
    setEditorOpen(true);
  };

  const openEdit = (tile: BrowseTile) => {
    setEditorMode("edit");
    setEditing(tile);
    setForm(tileToForm(tile));
    setImageFile(null);
    setError("");
    setFieldErrors({});
    setEditorOpen(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});

    const payload: Record<string, string | number | boolean | null> = {
      group: contentGroup,
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      slug: form.slug.trim() || form.title.trim().toLowerCase(),
      filter_value: form.filter_value.trim().toLowerCase(),
      gradient_css: form.gradient_css,
      order: Number(form.order) || 0,
      is_active: form.is_active,
    };
    if (contentGroup === "lugar_turistico") {
      payload.latitude = form.latitude.trim() || null;
      payload.longitude = form.longitude.trim() || null;
    }

    try {
      if (imageFile) {
        const body = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== null && v !== undefined) body.append(k, String(v));
        });
        body.append("is_active", payload.is_active ? "true" : "false");
        body.append("image", imageFile);
        if (editing) {
          await api.patch(`/inicio-bloques/${editing.id}/`, body);
        } else {
          await api.post("/inicio-bloques/", body);
        }
      } else if (editing) {
        await api.patch(`/inicio-bloques/${editing.id}/`, payload);
      } else {
        await api.post("/inicio-bloques/", payload);
      }
      showAdminToast(
        editorMode === "create" ? "Tarjeta creada correctamente." : "Cambios guardados.",
        "success",
      );
      closeEditor();
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatApiError(err.data));
        setFieldErrors(parseFieldErrors(err.data));
      } else {
        setError("No se pudo guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tile: BrowseTile) => {
    if (!confirm(`¿Eliminar «${tile.title}»?`)) return;
    try {
      await api.delete(`/inicio-bloques/${tile.id}/`);
      showAdminToast("Tarjeta eliminada.", "success");
      load();
    } catch (e) {
      showAdminToast(e instanceof ApiError ? e.message : "No se pudo eliminar", "error");
    }
  };

  const toggleActive = async (tile: BrowseTile) => {
    const next = tile.is_active === false;
    try {
      await api.patch(`/inicio-bloques/${tile.id}/`, { is_active: next });
      setTiles((prev) =>
        prev.map((t) => (t.id === tile.id ? { ...t, is_active: next } : t)),
      );
      showAdminToast(next ? "Tarjeta activada en la home." : "Tarjeta oculta en la home.", "success");
    } catch (e) {
      showAdminToast(e instanceof ApiError ? e.message : "Error al actualizar", "error");
    }
  };

  const persistOrder = async (ordered: BrowseTile[]) => {
    setReordering(true);
    try {
      await Promise.all(
        ordered.map((t, i) =>
          api.patch(`/inicio-bloques/${t.id}/`, { order: i + 1 }),
        ),
      );
      setTiles(ordered);
      showAdminToast("Orden actualizado.", "success");
    } catch {
      showAdminToast("No se pudo guardar el nuevo orden.", "error");
      load();
    } finally {
      setReordering(false);
    }
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const fromGlobal = filteredTiles[dragIndex];
    const toGlobal = filteredTiles[targetIndex];
    if (!fromGlobal || !toGlobal) return;

    const fullOrder = [...tiles].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const fromIdx = fullOrder.findIndex((t) => t.id === fromGlobal.id);
    const toIdx = fullOrder.findIndex((t) => t.id === toGlobal.id);
    if (fromIdx < 0 || toIdx < 0) return;

    void persistOrder(reorderTiles(fullOrder, fromIdx, toIdx));
  };

  const handleBulk = async (action: "activate" | "deactivate" | "delete") => {
    const ids = [...selected];
    if (ids.length === 0) return;

    if (action === "delete" && !confirm(`¿Eliminar ${ids.length} tarjeta(s)?`)) return;

    setBulkLoading(true);
    try {
      if (action === "delete") {
        await Promise.all(ids.map((id) => api.delete(`/inicio-bloques/${id}/`)));
        showAdminToast(`${ids.length} tarjeta(s) eliminada(s).`, "success");
      } else {
        const value = action === "activate";
        await Promise.all(
          ids.map((id) => api.patch(`/inicio-bloques/${id}/`, { is_active: value })),
        );
        showAdminToast(
          action === "activate"
            ? `${ids.length} tarjeta(s) activada(s).`
            : `${ids.length} tarjeta(s) desactivada(s).`,
          "success",
        );
      }
      setSelected(new Set());
      load();
    } catch {
      showAdminToast("No se completaron todas las acciones.", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelect = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const groupLabel = HOME_CONTENT_GROUPS.find((g) => g.value === contentGroup)?.label ?? "";

  return (
    <div className="admin-page admin-home-content-page">
      <AdminUsersToastHost />

      <header className="admin-home-header">
        <div>
          <Link to="/admin" className="back-link admin-link-btn">
            <PrimeIcon name="pi-arrow-left" size={14} /> Volver al dashboard
          </Link>
          <h1 className="admin-page-title">Configuración del sitio</h1>
          <p className="admin-page-sub">
            {isDesignTab
              ? "Colores, hero y forma visual de la interfaz pública y del panel."
              : "Gestiona tipos, regiones y departamentos que aparecen en la home. Arrastra para reordenar, sube imágenes y previsualiza el resultado."}
          </p>
        </div>
        {!isDesignTab && (
          <div className="admin-users-header-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setPreviewOpen(true)}
              disabled={loading}
            >
              <PrimeIcon name="pi-eye" size={14} />
              Vista previa de la home
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <PrimeIcon name="pi-plus" size={14} />
              Agregar nuevo
            </button>
          </div>
        )}
      </header>

      {!isDesignTab && (
        <div className="admin-users-kpi-grid admin-home-kpis">
          <article className="admin-kpi-card">
            <p className="admin-kpi-value">{loading ? "…" : metrics.total}</p>
            <p className="admin-kpi-label">Tarjetas en {groupLabel}</p>
          </article>
          <article className="admin-kpi-card">
            <p className="admin-kpi-value">{loading ? "…" : metrics.active}</p>
            <p className="admin-kpi-label">Activas en home</p>
          </article>
          <article className="admin-kpi-card">
            <p className="admin-kpi-value">{loading ? "…" : metrics.inactive}</p>
            <p className="admin-kpi-label">Ocultas</p>
          </article>
        </div>
      )}

      <div className="admin-users-tabs" role="tablist">
        {ADMIN_CONFIG_TABS.map((g) => (
          <button
            key={g.value}
            type="button"
            role="tab"
            className={`admin-users-tab${activeTab === g.value ? " is-active" : ""}`}
            onClick={() => {
              setActiveTab(g.value);
              setSearchInput("");
              setSearch("");
              setStatusFilter("all");
              closeEditor();
            }}
          >
            {g.icon && <PrimeIcon name={g.icon} size={14} />}
            {g.label}
          </button>
        ))}
      </div>

      {isDesignTab ? (
        <AdminDesignPanel />
      ) : (
        <>
      <div className="admin-users-toolbar-card">
        <form className="admin-users-toolbar" onSubmit={onSearchSubmit}>
          <div className="admin-users-search">
            <PrimeIcon name="pi-search" size={16} />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre o filtro"
              aria-label="Buscar tarjetas"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Buscar
          </button>
        </form>
        <div className="admin-users-toolbar-filters">
          <label className="admin-users-filter">
            <span>Estado</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as HomeContentStatusFilter)}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="admin-consultas-bulk-bar admin-home-bulk-bar">
          <span>{selected.size} seleccionada(s)</span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={bulkLoading}
            onClick={() => void handleBulk("activate")}
          >
            Activar
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={bulkLoading}
            onClick={() => void handleBulk("deactivate")}
          >
            Desactivar
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm admin-home-delete-btn"
            disabled={bulkLoading}
            onClick={() => void handleBulk("delete")}
          >
            Eliminar
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>
            Limpiar
          </button>
        </div>
      )}

      {reordering && <p className="muted admin-home-reorder-hint">Guardando nuevo orden…</p>}

      {loading ? (
        <p className="muted admin-home-loading">Cargando tarjetas…</p>
      ) : filteredTiles.length === 0 ? (
        <div className="admin-consultas-empty">
          <PrimeIcon name="pi-images" size={44} />
          <p className="admin-consultas-empty-title">No hay tarjetas</p>
          <p className="muted">
            {tiles.length === 0
              ? `Crea la primera tarjeta de ${groupLabel.toLowerCase()}.`
              : "Prueba otro filtro o término de búsqueda."}
          </p>
          {tiles.length === 0 && (
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              Agregar tarjeta
            </button>
          )}
        </div>
      ) : (
        <ul
          className="admin-home-tile-grid"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (dragOverIndex !== null) handleDrop(dragOverIndex);
            setDragIndex(null);
            setDragOverIndex(null);
          }}
        >
          {filteredTiles.map((tile, index) => (
            <HomeContentTileCard
              key={tile.id}
              tile={tile}
              index={index}
              selected={selected.has(tile.id)}
              dragging={dragIndex === index}
              dragOver={dragOverIndex === index && dragIndex !== index}
              onSelectChange={(checked) => toggleSelect(tile.id, checked)}
              onEdit={() => openEdit(tile)}
              onDelete={() => void remove(tile)}
              onToggleActive={() => void toggleActive(tile)}
              onDragStart={(i) => setDragIndex(i)}
              onDragEnter={(i) => setDragOverIndex(i)}
              onDragEnd={() => {
                setDragIndex(null);
                setDragOverIndex(null);
              }}
            />
          ))}
        </ul>
      )}

      <HomeContentEditorModal
        open={editorOpen}
        mode={editorMode}
        activeGroup={contentGroup}
        form={form}
        setForm={setForm}
        editing={editing}
        imageFile={imageFile}
        setImageFile={setImageFile}
        imagePreviewUrl={null}
        fieldErrors={fieldErrors}
        error={error}
        saving={saving}
        onClose={closeEditor}
        onSubmit={save}
      />

      <HomePreviewModal
        open={previewOpen}
        group={contentGroup}
        tiles={tiles}
        onClose={() => setPreviewOpen(false)}
      />
        </>
      )}
    </div>
  );
}
